import { and, eq } from 'drizzle-orm';
import { DeleteIntegrationParams, UpsertIntegrationParams, UserHandlers } from './users.d.types';
import { integrations, users } from '../../controller/schema/organizations';
import { DrizzleDb } from '../../controller/db.schema';
import { SelectIntegrationSchema } from '../../controller/validations';
import { cacheHandler } from '../../../cache/cache-handler.d.js';

export const userHandlers: UserHandlers = {
	getUserData: async (env, db, data, userData) => {
		try {
			const { userId, organizationId } = userData;
			const { withIntegrations } = data;

			if (!userId) {
				throw new Error('El ID de usuario es requerido para esta operación.');
			}

			const queryResponse = await db.query.users.findFirst({
				where: and(eq(users.id, userId), eq(users.organizationId, organizationId)),
				with: {
					integrations: withIntegrations
						? {
								where: data.service ? eq(integrations.service, data.service) : undefined,
								columns: {
									accessToken: data.withAccessToken ? true : undefined,
									refreshToken: data.withRefreshToken ? true : undefined,
									connectedEmail: true,
									createdAt: true,
									updatedAt: true,
									expiresAt: true,
									id: true,
									userId: true,
									service: true,
									metadata: true,
								},
						  }
						: undefined,
				},
			});

			return queryResponse;
		} catch (error) {
			console.error('Error en getUserIntegrations:', error);
			throw error;
		}
	},

	createOrUpdateIntegration: async (env, db, data, userData) => {
		try {
			const { userId, organizationId } = userData;

			if (!userId) throw new Error();

			if (data.operation === 'create') {
				const { service, ...integrationData } = data.values;
				console.log('VALUES VALORES =====> ', data.values);

				console.log('INTEGRATZAO -> ', service, integrationData);
				const retrievedTokens = await env.INTEGRATIONS_GATEWAY.getTokens(
					{
						service: service as any,
						data: {
							code: integrationData.code || '',
							redirect_uri: integrationData.redirectUri || '',
							code_verifier: integrationData.codeVerifier || '',
						},
					},
					'generate'
				);

				if (!retrievedTokens.success) throw new Error();

				const [newIntegration] = await db
					.insert(integrations)
					.values({
						...retrievedTokens.data,
						userId,
						organizationId,
					})
					.returning();

				await createOrUpdateIntegrationCache(env, organizationId, newIntegration);

				if (!newIntegration) {
					throw new Error('Failed to create integration.'); // Mensaje de error corregido
				}

				const { accessToken, refreshToken, ...integrationResponse } = newIntegration;
				return integrationResponse;
			}

			if (data.operation === 'update') {
				const { service, ...integrationData } = data.values;
				const { id } = data; // Id de la integración.

				const regeneratedTokens = await env.INTEGRATIONS_GATEWAY.getTokens(
					{
						service: service as any,
						data: {
							refresh_token: integrationData.refreshToken || '',
						},
					},
					'regenerate'
				);

				if (!regeneratedTokens.success) {
					console.log('Ocurrio un error en la obtencion del token de regeneracion');
					throw new Error();
				}

				//b76f6ee6-a140-4cc9-a652-a399965dcd83
				const { accessToken, refreshToken, updatedAt, createdAt, expiresAt } = regeneratedTokens.data;

				const [updatedIntegration] = await db
					.update(integrations)
					.set({
						refreshToken,
						accessToken,
						updatedAt,
						createdAt,
						expiresAt,
					})
					.where(and(eq(integrations.id, id), eq(integrations.userId, userId)))
					.returning();

				if (!updatedIntegration) {
					throw new Error('Integration not found or you do not have permission to update it.'); // Mensaje de error corregido
				}
				console.log('INTEGRACIÓN ACTUALIZADA ----------------> ', updatedIntegration);

				await createOrUpdateIntegrationCache(env, organizationId, updatedIntegration);

				return { accessToken: updatedIntegration.accessToken };
			}

			// Esta línea debería ser inalcanzable si la validación de Zod funciona.
			throw new Error('Invalid operation specified.');
		} catch (error) {
			console.error('Error in createOrUpdateIntegration:', error); // Mensaje de error corregido
			throw error;
		}
	},

	deleteUserIntegration: async (env, db, data, userData) => {
		try {
			const { id, service } = data;
			const { userId } = userData;
			if (!userId) throw new Error();

			const [integrationDetails] = await db
				.select()
				.from(integrations)
				.where(and(eq(integrations.id, id), eq(integrations.service, service), eq(integrations.userId, userId)));

			console.log('detalles de integratzao -> ', integrationDetails);
			const accessToken = integrationDetails.accessToken;
			const refreshToken = integrationDetails.refreshToken;

			// Se remueven los tokens de la plataforma integrada primero.
			const removedTokens = await env.INTEGRATIONS_GATEWAY.removeTokens(service as any, accessToken, refreshToken);

			if (!removedTokens.success) throw new Error('Ha ocurrido un error en la removención de tokens.');

			const [deletedIntegration] = await db.delete(integrations).where(eq(integrations.id, id)).returning({ id: integrations.id });

			if (!deletedIntegration.id) {
				// [DBLOG]: Aqui toca hacer un log ya que se elimino del servicio pero no de la DB.
			}

			return { id };
		} catch (error) {
			console.error('Error in deleteIntegration:', error);
			throw error;
		}
	},
};

/**
 * MANEJADORES DE CACHE PARA 'INTEGRATIONS'
 */
const createOrUpdateIntegrationCache = async (
	env: Env,
	organizationId: string,
	integration: SelectIntegrationSchema & { accessToken: string; refreshToken: string }
) => {
	const { cacheKeyBuilder, cacheManager } = cacheHandler(env, organizationId);
	const key = cacheKeyBuilder.entity({ name: 'integrations', identifier: integration.id }).build();
	console.log('llave -----------> ', key);
	const cacheResult = await cacheManager.put({ key, value: integration });
	console.log('resultado de cache => ', cacheResult);
};
