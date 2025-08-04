import {
	D1MutationResponse,
	GetClaimedWorkAggregationResponse,
	GetOrganizationsCountResponse,
	GetProofOfPaymentResponse,
	GetQueuedBatchesResponse,
} from '@core-service/types';

export default {
	async fetch(request: Request): Promise<Response> {
		return new Response('Billing Orchestrator is alive.');
	},
	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log(`[CRON] Iniciando ciclo de orquestación y finalización...`);
		ctx.waitUntil(orchestrateAndFinalizeBilling(env));
	},
} satisfies ExportedHandler<Env>;

async function orchestrateAndFinalizeBilling(env: Env): Promise<void> {
	// --- FASE 1: FINALIZACIÓN DE LOTES ANTERIORES ---
	try {
		console.log('[FASE 1] Iniciando: Búsqueda de lotes en estado QUEUED para finalizar.');

		const queuedBatchesResponse = await env.CORE_SERVICE.D1DatabasesHandler({
			type: 'logs',
			query: { method: 'getQueuedBatches', data: {} },
			userData: { organizationId: '' },
		});

		if (!queuedBatchesResponse.success) {
			console.error(
				`[CRITICAL-FINALIZE] Fallo al obtener los lotes en cola. Se omitirá este ciclo. Error: ${JSON.stringify(
					queuedBatchesResponse.error
				)}`
			);
		} else {
			console.log('DATOS DE LA QUEUED BATCHES RESPONSE ---------------->: ', queuedBatchesResponse.data);
			const queuedBatches = queuedBatchesResponse.data as GetQueuedBatchesResponse;
			if (!queuedBatches || queuedBatches.length === 0) {
				console.log('[FASE 1] Completada: No se encontraron lotes para finalizar.');
			} else {
				const batchIdsToVerify = queuedBatches.map((b) => b.processing_batch_id).filter((id) => id);
				if (batchIdsToVerify.length > 0) {
					console.log(`[FASE 1] Verificando ${batchIdsToVerify.length} lotes candidatos...`);

					const proofOfPaymentResponse = await env.CORE_SERVICE.mainDatabaseHandler({
						type: 'transactions',
						query: { data: { batchIdsToVerify }, method: 'getProofOfPayment' },
						userData: { organizationId: '' },
					});

					if (!proofOfPaymentResponse.success) {
						console.error(
							`[CRITICAL-FINALIZE] Fallo al obtener la prueba de pago. La finalización se reintentará en el próximo ciclo. Error: ${JSON.stringify(
								proofOfPaymentResponse.error
							)}`
						);
					} else {
						const proofOfPayment = proofOfPaymentResponse.data as GetProofOfPaymentResponse;
						const completedCountsMap = new Map(proofOfPayment.map((p) => [p.batchId, p.completedCount]));

						for (const batchId of batchIdsToVerify) {
							const totalOrgsResponse = await env.CORE_SERVICE.D1DatabasesHandler({
								type: 'logs',
								query: { method: 'getOrganizationsCount', data: { batchId } },
								userData: { organizationId: '' },
							});

							if (!totalOrgsResponse.success) {
								console.error(`[CRITICAL-FINALIZE] No se pudo obtener el conteo de orgs para el batch ${batchId}. Saltando.`);
								continue;
							}

							// <<< AFIRMAMOS EL TIPO PARA LA RESPUESTA DE CONTEO
							const totalOrgsInBatch = (totalOrgsResponse.data as GetOrganizationsCountResponse).total_orgs;
							const paidOrgsInBatch = completedCountsMap.get(batchId) ?? 0;

							if (totalOrgsInBatch > 0 && paidOrgsInBatch >= totalOrgsInBatch) {
								console.log(`[FASE 1] ÉXITO para batch ${batchId}. (${paidOrgsInBatch}/${totalOrgsInBatch}). Marcando como PROCESSED.`);
								await env.CORE_SERVICE.D1DatabasesHandler({
									type: 'logs',
									query: { method: 'finalizeProcessedBatch', data: { batchId } },
									userData: { organizationId: '' },
								});
							} else if (totalOrgsInBatch > 0) {
								console.log(`[FASE 1] ESPERANDO por batch ${batchId}. (${paidOrgsInBatch}/${totalOrgsInBatch}).`);
							}
						}
					}
				}
			}
		}
	} catch (error) {
		console.error('[CRITICAL-FINALIZE] Fallo catastrófico en la FASE 1. Este error no detuvo la FASE 2.', error);
	}

	// --- FASE 2: CREACIÓN DE NUEVOS LOTES DE TRABAJO ---
	const newBatchId = crypto.randomUUID();
	try {
		console.log(`[FASE 2] Iniciando: Creación de nuevo lote con Batch ID: ${newBatchId}`);

		const claimResponse = await env.CORE_SERVICE.D1DatabasesHandler({
			type: 'logs',
			query: { method: 'claimPendingWorkBatch', data: { newBatchId } },
			userData: { organizationId: '' },
		});

		// <<< PATRÓN "VALIDAR Y AFIRMAR" APLICADO AQUÍ
		if (!claimResponse.success) {
			// Si la llamada al servicio falla, lanzamos un error para que el bloque CATCH principal lo maneje.
			throw new Error(`Fallo al reclamar trabajo: ${JSON.stringify(claimResponse.error)}`);
		}
		const claimData = claimResponse.data as D1MutationResponse;
		if (claimData.changes === 0) {
			console.log('[FASE 2] Completada: No hay nuevos logs PENDING para procesar.');
			return;
		}
		console.log(`[FASE 2] [${newBatchId}] Reclamados ${claimData.changes} logs.`); // <<< Usamos la variable con tipo

		const aggregationResponse = await env.CORE_SERVICE.D1DatabasesHandler({
			type: 'logs',
			query: { method: 'getClaimedWorkAggregation', data: { batchId: newBatchId } },
			userData: { organizationId: '' },
		});

		// <<< PATRÓN "VALIDAR Y AFIRMAR" APLICADO AQUÍ
		if (!aggregationResponse.success) {
			throw new Error(`Fallo al agregar trabajo reclamado: ${JSON.stringify(aggregationResponse.error)}`);
		}
		const results = aggregationResponse.data as GetClaimedWorkAggregationResponse;
		if (!results || results.length === 0) {
			throw new Error(`Inconsistencia: Se reclamaron logs pero no se pudieron agregar en el lote ${newBatchId}.`);
		}

		const messages = results.map((row) => ({
			body: {
				jobId: crypto.randomUUID(),
				batchId: newBatchId,
				organizationId: row.organization_id,
				totalCostInUnits: Number(row.total_cost_in_units),
			},
		}));

		console.log(`[FASE 2] [${newBatchId}] Encolando ${messages.length} trabajos...`);
		for (let i = 0; i < messages.length; i += 100) {
			await env.BILLING_JOBS_QUEUE.sendBatch(messages.slice(i, i + 100));
		}

		await env.CORE_SERVICE.D1DatabasesHandler({
			type: 'logs',
			query: { method: 'confirmBatchEnqueued', data: { batchId: newBatchId } },
			userData: { organizationId: '' },
		});
		console.log(`[FASE 2] [${newBatchId}] Lote confirmado y logs marcados como 'QUEUED'.`);
	} catch (error) {
		console.error(`[CRITICAL-CREATE] Fallo en la FASE 2 para el lote ${newBatchId}. Revirtiendo...`, error);
		await env.CORE_SERVICE.D1DatabasesHandler({
			type: 'logs',
			query: { method: 'rollbackClaimedBatch', data: { batchId: newBatchId } },
			userData: { organizationId: '' },
		});
		console.log(`[FASE 2] [${newBatchId}] Reclamación revertida.`);
	}
}
