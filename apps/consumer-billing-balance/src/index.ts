/**
 * El contrato del mensaje que esperamos de la cola.
 * Contiene todo lo necesario para la transacción y la trazabilidad.
 */
type BillingJob = {
	jobId: string; // UUID único para este trabajo de liquidación. Clave para la idempotencia.
	batchId: string; // ID del lote de orquestación. Clave para la trazabilidad y finalización.
	organizationId: string;
	totalCostInUnits: number;
};

/**
 * El handler de la cola. Su lógica es perfecta: procesa los mensajes
 * en paralelo y confía en que cada llamada maneje sus propios errores.
 */
export default {
	async queue(batch: MessageBatch<BillingJob>, env: Env): Promise<void> {
		const promises = batch.messages.map((message) => settleOrganizationBalance(message, env));
		await Promise.all(promises);
	},
} satisfies ExportedHandler<Env, BillingJob>;

/**
 * La lógica de negocio ATÓMICA y IDEMPOTENTE para liquidar el saldo de UNA organización.
 */
async function settleOrganizationBalance(message: Message<BillingJob>, env: Env): Promise<void> {
	const { jobId, batchId, organizationId, totalCostInUnits } = message.body;

	console.log(`[Cuerpo del mensaje]: ${JSON.stringify(message.body)}`);
	try {
		// La llamada a nuestro servicio core es la operación principal y puede fallar.
		const setBalanceResponse = await env.CORE_SERVICE.mainDatabaseHandler({
			type: 'transactions',
			query: {
				method: 'setBalanceForOrganization',
				data: { batchId, jobId, totalCostInUnits },
			},
			userData: { organizationId },
		});

		// CASO 1: Exito.
		if (setBalanceResponse.success) {
			console.log(`[COMMIT-SUCCESS] [${organizationId}] La transacción para el Job ${jobId} se completó en core-service.`);
			console.log(`[ACK] [${organizationId}] Trabajo ${jobId} completado. Mensaje confirmado.`);
			message.ack();
			return;
		}

		// CASO 2: FALLO CONTROLADO (MANEJO DE ERRORES DE NEGOCIO)
		// Si llegamos aquí, success es false. Ahora analizamos el error.
		const errorDetails = setBalanceResponse.error;
		console.warn(`[TX-FAILED] [${organizationId}] La transacción para el Job ${jobId} falló en core-service. Razón: ${errorDetails.name}`);

		if (errorDetails.name === 'INSUFFICIENT_BALANCE') {
			console.warn(`[${organizationId}] Saldo insuficiente detectado. Devolviendo logs a PENDING.`);

			// Lógica de compensación: como la transacción falló, revertimos el estado en D1.
			const unmarkLogsQuery = `UPDATE generations SET status = 'PENDING' WHERE organization_id = ? AND status = 'QUEUED'`;
			await env.LOGS.prepare(unmarkLogsQuery).bind(organizationId).run();

			console.log(`[ACK] [${organizationId}] Logs devueltos a PENDING. Mensaje confirmado para evitar reintentos inútiles.`);
			message.ack(); // Hacemos ACK porque el fallo es terminal y ya lo manejamos.
		} else {
			// CASO 3: FALLO INESPERADO DEL SISTEMA
			// El error es algo que no preveíamos (ej. DB caída, bug en el código de core-service).
			// Estos errores se reintentan.
			console.error(
				`[RETRY] [${organizationId}] Fallo de sistema inesperado desde core-service: ${errorDetails.name} - ${errorDetails.message}. Reintentando mensaje.`
			);
			message.retry();
		}
	} catch (error) {
		// CASO 4: FALLO CATASTRÓFICO (El propio Service Binding falló)
		// Este bloque catch ahora solo se activará si la llamada a `env.CORE_SERVICE.mainDatabaseHandler` falla
		// a nivel de red o si el worker de core-service se estrella y devuelve un error de runtime,
		// en lugar de un objeto `ServiceResponse` bien formado.
		console.error(
			`[FATAL-RETRY] [${organizationId}] Fallo catastrófico al comunicarse con core-service para el Job ${jobId}. Reintentando.`,
			error
		);
		message.retry();
	}
}
