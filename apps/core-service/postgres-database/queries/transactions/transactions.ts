import { and, asc, eq, gt, inArray, isNotNull, sql } from 'drizzle-orm';
import { TransactionHandlers } from './transactions.d.types';
import { balances, balanceTransactions } from '../../controller/schema/organizations';
import { ConsumerError } from '../../lib/errors';

/**
 * Estas queries son especiales y deben usarse unicamente para creditos/debitos en workers especiales.
 * NO se deben usar en otros workers aparte de: producer-billing-orchestrator / consumer-billing-balance
 * Y unicamente para consultas de lectura en el lado del cliente del usuario (dashboard)
 */
export const transactionHandlers: TransactionHandlers = {
	// Prueba de pago para el correcto procesamiento en producer-billing-orchestrator
	getProofOfPayment: async (env, db, data) => {
		try {
			const { batchIdsToVerify } = data;

			if (batchIdsToVerify.length === 0) {
				return [];
			}

			const queryResponse = await db
				.select({
					batchId: sql<string>`${balanceTransactions.batchId}`,
					completedCount: sql<number>`count(${balanceTransactions.id})::int`,
				})
				.from(balanceTransactions)
				.where(
					and(
						// Esta condición sigue siendo vital para el rendimiento y la lógica.
						isNotNull(balanceTransactions.batchId),
						inArray(balanceTransactions.batchId, batchIdsToVerify),
						eq(balanceTransactions.type, 'usage_fee')
					)
				)
				.groupBy(balanceTransactions.batchId);
			return queryResponse;
		} catch (err) {
			console.error('Error en getProofOfPayment:', err);
			throw err;
		}
	},

	setBalanceForOrganization: async (env, db, data, userData) => {
		try {
			const { batchId, jobId, totalCostInUnits } = data;
			const { organizationId } = userData;
			const totalDebitInUsdCents = BigInt(totalCostInUnits);

			console.log('DEBITO TOTAL -------->> ?> ', totalDebitInUsdCents);

			// La función `db.transaction` de Drizzle es la clave.
			// Automáticamente ejecuta BEGIN, y si el callback tiene éxito, ejecuta COMMIT.
			// Si el callback lanza CUALQUIER error, ejecuta ROLLBACK.
			await db.transaction(async (tx) => {
				// 1. IDEMPOTENCY CHECK
				const existingTx = await tx.query.balanceTransactions.findFirst({
					where: eq(balanceTransactions.jobId, jobId),
				});
				if (existingTx) {
					console.warn(`[${organizationId}] [Job ID: ${jobId}] Trabajo duplicado. Saltando.`);
					return;
				}

				// 2. LÓGICA FIFO SIMPLIFICADA SOBRE USD CENTS
				// Seleccionamos las capas de crédito (Recargas y Promociones) más antiguas (FIFO)
				// que aún tengan saldo disponible en centavos de dólar.
				const creditLayers = await tx
					.select({
						id: balanceTransactions.id,
						remainingInUsdCents: balanceTransactions.remainingInUsdCents,
					})
					.from(balanceTransactions)
					.where(
						and(
							eq(balanceTransactions.organizationId, organizationId),
							// Ahora consumimos de cualquier capa que añada valor.
							inArray(balanceTransactions.type, ['recharge', 'promotion_credit']),
							gt(balanceTransactions.remainingInUsdCents, 0)
						)
					)
					.orderBy(asc(balanceTransactions.createdAt))
					.for('update');
				console.log('CAPAS DE CREDIT LAYER ?> ', creditLayers);

				let centsLeftToDebit = totalDebitInUsdCents;
				const updateLayerPromises: Promise<any>[] = [];

				for (const layer of creditLayers) {
					if (centsLeftToDebit <= 0) break;
					console.log('centsLeftToDebit.. PARA ORG...... => ' + organizationId + '-> ', creditLayers);

					const debitFromThisLayer = centsLeftToDebit < layer.remainingInUsdCents ? centsLeftToDebit : layer.remainingInUsdCents;

					updateLayerPromises.push(
						tx
							.update(balanceTransactions)
							.set({ remainingInUsdCents: sql`${balanceTransactions.remainingInUsdCents} - ${debitFromThisLayer}` })
							.where(eq(balanceTransactions.id, layer.id))
					);

					centsLeftToDebit -= debitFromThisLayer;
				}

				// 3. MANEJO DE SALDO INSUFICIENTE
				if (centsLeftToDebit > 0) {
					throw new ConsumerError({
						name: 'INSUFFICIENT_BALANCE',
						message: 'No hay suficiente balance.',
					});
				}

				// 4. ACTUALIZACIÓN DE SALDOS Y REGISTRO DE DÉBITO
				// Ejecuta los UPDATEs en las capas de crédito consumidas.
				await Promise.all(updateLayerPromises);

				// Actualiza el balance principal de la organización.
				await tx
					.update(balances)
					.set({ balanceInUsdCents: sql`${balances.balanceInUsdCents} - ${totalDebitInUsdCents}` })
					.where(eq(balances.organizationId, organizationId));

				// Inserta la transacción de débito como registro de auditoría.
				const balance = await tx.query.balances.findFirst({
					where: eq(balances.organizationId, organizationId),
					columns: { id: true },
				});
				if (!balance) throw new Error(`Inconsistencia: No se encontró balance para ${organizationId}`);

				await tx.insert(balanceTransactions).values({
					jobId,
					batchId,
					organizationId,
					balanceId: balance.id,
					type: 'usage_fee',
					amountInUsdCents: -totalDebitInUsdCents,
					remainingInUsdCents: 0,
					feeInUsdCents: 0,
					description: `Débito por uso del sistema. Job: ${jobId}`,
				});
			});
		} catch (err) {
			throw err;
		}
	},
};
