// --- core-service/d1-database/queries/logs.ts (Versión Final y Documentada) ---

import { randomUUID } from 'node:crypto';
import { LogHandlers } from './logs.d.types';

/**
 * Contiene todos los handlers que interactúan con la base de datos D1 (LOGS).
 * Cada función representa una operación atómica que es invocada por otros workers
 * a través de un Service Binding, manteniendo la lógica de base de datos centralizada.
 */
export const logHandlers: LogHandlers = {
	/**
	 * Obtiene una lista de todos los `processing_batch_id` distintos que tienen al menos un log en estado 'QUEUED'.
	 * Es el punto de entrada para la Fase 1 del Orquestador, identificando los lotes de trabajo
	 * que están listos para ser verificados contra la base de datos financiera (Neon) y finalizados.
	 * @param env - El entorno del worker, contiene el binding a la base de datos D1 (LOGS).
	 * @param data - Parámetros de la consulta (vacío para este método).
	 * @returns Una promesa que resuelve a un array de objetos, cada uno con un `processing_batch_id`.
	 */
	getQueuedBatches: async (env, data) => {
		try {
			const query = `
				SELECT processing_batch_id FROM generations
				WHERE status = 'QUEUED'
				GROUP BY processing_batch_id;
			`;
			const { results } = await env.LOGS.prepare(query).all<{ processing_batch_id: string }>();
			return results ?? [];
		} catch (error) {
			throw error;
		}
	},

	/**
	 * Calcula el número de organizaciones únicas que componían un lote de trabajo específico.
	 * Es una pieza clave en la Fase 1 del Orquestador, ya que este número se compara
	 * con la 'Prueba de Pago' obtenida de Neon para determinar si un lote está 100% completado.
	 * @param env - El entorno del worker.
	 * @param data - Contiene el `batchId` del lote a verificar.
	 * @returns Una promesa que resuelve a un objeto con el conteo total de organizaciones.
	 */
	getOrganizationsCount: async (env, data) => {
		const { batchId } = data;
		const query = `SELECT COUNT(DISTINCT organization_id) as total_orgs FROM generations WHERE processing_batch_id = ?`;
		const result = await env.LOGS.prepare(query).bind(batchId).first<{ total_orgs: number }>();
		return { total_orgs: result?.total_orgs ?? 0 };
	},

	/**
	 * Reclama atómicamente un lote de hasta 1000 logs que están en estado 'PENDING'.
	 * Les asigna un `newBatchId` y los pasa al estado intermedio 'QUEUING'. Esta es la operación
	 * más crítica de la Fase 2 del Orquestador para prevenir condiciones de carrera y doble procesamiento.
	 * @param env - El entorno del worker.
	 * @param data - Contiene el `newBatchId` a asignar al nuevo lote de trabajo.
	 * @returns Una promesa que resuelve al objeto de mutación de D1, indicando el éxito y el número de filas afectadas.
	 */
	claimPendingWorkBatch: async (env, data) => {
		const { newBatchId } = data;
		const query = `
            UPDATE generations
            SET status = 'QUEUING', processing_batch_id = ?1
            WHERE id IN (SELECT id FROM generations WHERE status = 'PENDING' LIMIT 1000);
        `;
		const { success, meta } = await env.LOGS.prepare(query).bind(newBatchId).run();
		return { success, changes: meta.changes, lastRowId: meta.last_row_id };
	},

	/**
	 * Agrega los costos por organización para un lote de trabajo que acaba de ser reclamado (estado 'QUEUING').
	 * Esta consulta asegura que solo se sumen los costos de los logs que esta ejecución del orquestador posee,
	 * evitando la inclusión de 'logs fantasma' que podrían haber sido insertados mientras la operación estaba en curso.
	 * @param env - El entorno del worker.
	 * @param data - Contiene el `batchId` del lote reclamado a agregar.
	 * @returns Una promesa que resuelve a un array de objetos, cada uno con el `organization_id` y su `total_cost_in_units`.
	 */
	getClaimedWorkAggregation: async (env, data) => {
		const { batchId } = data;
		const query = `
            SELECT organization_id, SUM(cost) AS total_cost_in_units
            FROM generations WHERE processing_batch_id = ?1
            GROUP BY organization_id;
        `;
		// Le decimos explícitamente a .all() la forma de una fila del resultado (`<...>{}`).
		// Esto es crucial para que TypeScript infiera el tipo de retorno correcto y evite errores.
		const { results } = await env.LOGS.prepare(query).bind(batchId).all<{ organization_id: string; total_cost_in_units: number }>();
		return results ?? [];
	},

	/**
	 * Confirma que un lote de trabajo ha sido enviado exitosamente a la cola de mensajes.
	 * Actualiza el estado de los logs de 'QUEUING' a 'QUEUED', completando el ciclo de la Fase 2 del Orquestador.
	 * @param env - El entorno del worker.
	 * @param data - Contiene el `batchId` del lote a confirmar.
	 * @returns Una promesa que resuelve al objeto de mutación de D1.
	 */
	confirmBatchEnqueued: async (env, data) => {
		const { batchId } = data;
		const query = `UPDATE generations SET status = 'QUEUED' WHERE processing_batch_id = ?1`;
		const { success, meta } = await env.LOGS.prepare(query).bind(batchId).run();
		return { success, changes: meta.changes, lastRowId: meta.last_row_id };
	},

	/**
	 * Revierte una reclamación de trabajo fallida. Si algo sale mal en la Fase 2 (ej. la cola no responde)
	 * después de reclamar los logs, esta función los devuelve al estado 'PENDING' y elimina el `processing_batch_id`.
	 * Es una función crucial para la auto-reparación y resiliencia del sistema.
	 * @param env - El entorno del worker.
	 * @param data - Contiene el `batchId` del lote fallido a revertir.
	 * @returns Una promesa que resuelve al objeto de mutación de D1.
	 */
	rollbackClaimedBatch: async (env, data) => {
		const { batchId } = data;
		const query = `
            UPDATE generations SET status = 'PENDING', processing_batch_id = NULL
            WHERE processing_batch_id = ?1;
        `;
		const { success, meta } = await env.LOGS.prepare(query).bind(batchId).run();
		return { success, changes: meta.changes, lastRowId: meta.last_row_id };
	},

	/**
	 * Marca todos los logs de un lote como 'PROCESSED'. Esta es la etapa final de la Fase 1
	 * y solo se invoca después de que el Orquestador ha verificado exitosamente que todas las transacciones
	 * para ese lote han sido liquidadas en la base de datos de Neon.
	 * @param env - El entorno del worker.
	 * @param data - Contiene el `batchId` del lote verificado a finalizar.
	 * @returns Una promesa que resuelve al objeto de mutación de D1.
	 */
	finalizeProcessedBatch: async (env, data) => {
		const { batchId } = data;
		const query = `UPDATE generations SET status = 'PROCESSED' WHERE processing_batch_id = ?1 AND status = 'QUEUED'`;
		const { success, meta } = await env.LOGS.prepare(query).bind(batchId).run();
		return { success, changes: meta.changes, lastRowId: meta.last_row_id };
	},

	/**
	 * Handler de desarrollo para generar una gran cantidad de datos de log sintéticos en D1.
	 * Utiliza una lista predefinida de IDs de organización para poblar la base de datos con trabajo pendiente,
	 * permitiendo pruebas completas de todo el flujo de facturación.
	 * @param env - El entorno del worker.
	 * @returns Una promesa que resuelve a un objeto con un mensaje de éxito y el número de registros creados.
	 */
	generateSyntheticLogs: async (env) => {
		console.log('[CORE-SERVICE] Iniciando la generación de datos sintéticos para D1...');

		const orgIds = [
			'org_6VkgJZPon0UTsNfa',
			'org_A1bC2dE3fG4hI5jK',
			'org_L6mN7oP8qR9sT0uV',
			'org_W1xY2zZ3aB4cD5eF',
			'org_G6hI7jK8lM9nO0pQ',
			'org_R1sT2uV3wX4yZ5zA',
			'org_B6cD7eF8gH9iJ0kL',
			'org_M1nO2pQ3rS4tU5vW',
			'org_X6yZ7zZ8aB9cD0eF',
			'org_I1jK2lM3nO4pQ5rS',
		];

		const totalRecords = 4000;
		const now = Date.now();
		const syntheticLogs = [];

		for (let i = 0; i < totalRecords; i++) {
			const log = {
				idempotencyKey: randomUUID(),
				inputTokens: Math.floor(Math.random() * 2000) + 500,
				outputTokens: Math.floor(Math.random() * 500) + 10,
				cost: Math.floor(Math.random() * 50000) + 1000,
				model: 'openai/gpt-4o-mini',
				connectionType: 'organizational',
				to: '+14155238886',
				from: '+573146816140',
				organizationId: orgIds[i % orgIds.length],
				createdAt: new Date(now - i * 60000).toISOString(),
				status: 'PENDING',
			};
			syntheticLogs.push(log);
		}

		console.log(`[CORE-SERVICE] Generados ${syntheticLogs.length} registros. Insertando en D1...`);

		// La inserción se realiza en lotes (batches) para un rendimiento óptimo
		// y para evitar exceder los límites de operación de D1.
		const batchSize = 500;
		for (let i = 0; i < syntheticLogs.length; i += batchSize) {
			const batch = syntheticLogs.slice(i, i + batchSize);
			const stmt = env.LOGS.prepare(
				`INSERT INTO generations (idempotency_key, input_tokens, output_tokens, cost, model, connection_type, "to", "from", organization_id, created_at, status)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
                 ON CONFLICT(idempotency_key) DO NOTHING`
			);
			const statements = batch.map((log) =>
				stmt.bind(
					log.idempotencyKey,
					log.inputTokens,
					log.outputTokens,
					log.cost,
					log.model,
					log.connectionType,
					log.to,
					log.from,
					log.organizationId,
					log.createdAt,
					log.status
				)
			);
			await env.LOGS.batch(statements);
			console.log(`[CORE-SERVICE] Insertado lote de ${batch.length} logs.`);
		}

		const successMessage = `¡Éxito! Se insertaron ${syntheticLogs.length} registros sintéticos en la base de datos D1.`;
		console.log(`[CORE-SERVICE] ${successMessage}`);

		return {
			message: successMessage,
			recordCount: syntheticLogs.length,
		};
	},

	insertLogsIntoD1: async (env, data) => {
		// Preparar la sentencia SQL corregida para el tipo D1Data
		// Se añade la columna idempotency_key y la cláusula ON CONFLICT para evitar duplicados.
		const stmt = env.LOGS.prepare(
			`INSERT INTO generations (idempotency_key,
			input_tokens, output_tokens, cost, model, connection_type, 
			"to", "from", organization_id, created_at, status
		) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
		 ON CONFLICT(idempotency_key) DO NOTHING`
		);

		// Crear statements en batch
		const statements = data.map((log) =>
			stmt.bind(
				log.idempotencyKey,
				log.inputTokens,
				log.outputTokens,
				log.cost,
				log.model,
				log.connectionType,
				log.to,
				log.from,
				log.organizationId,
				log.createdAt,
				log.status
			)
		);

		console.log('statements', statements);

		// Ejecutar batch con manejo de errores
		try {
			await env.LOGS.batch(statements);
			// ON CONFLICT DO NOTHING no devuelve error en duplicados, simplemente los ignora.
			// El sistema se "auto-corrige" en caso de reintentos.
			console.log(`[D1] Batch de ${data.length} registros procesado.`);

			return;
		} catch (error) {
			console.error(`[D1] Error en inserción batch:`, error);
			throw error; // Re-throw para que el caller pueda manejar el error
		}
	},
};
