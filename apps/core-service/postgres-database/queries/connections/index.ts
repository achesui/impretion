import { connections, connectionSubscriptions } from '../../controller/schema/organizations';
import { ConnectionHandlers, GetConnectionResponse } from './connections.d.types';
import { and, eq, sql } from 'drizzle-orm';
import { cacheHandler } from '../../../cache/cache-handler.d.js';
import { selectConnectionSchema } from '../../controller/validations';
import { JsonFilter } from '../../../types';
import { createJsonbCondition } from '../../lib/jsonb-filter';
import { sagaPattern } from '../../../utils/saga';

export const connectionHandlers: ConnectionHandlers = {
	// Tabla: connections
	getConnections: async (env, db, data, userData) => {
		const { userId } = userData;
		const { filterByConnectedWith, filterByMetadata, withSubscriptions, type } = data;

		/**
		 * Si la obtención de la conexión es mediante el campo "connectedWith" se obtiene directamente del cache
		 * La obtención de una conexión por medio de este campo probablemente sea de un mensaje
		 * Los mensajes suelen ser recurrentes, por lo que obtener desde el cache mediante "connectedWith" es buena practica.
		 */
		if (filterByConnectedWith) {
			try {
				const { cacheManager } = cacheHandler(env, '');
				const key = getConnectionCacheKey(filterByConnectedWith, env);
				console.log('Cache key: ', key);

				const cachedConnection = await cacheManager.get<GetConnectionResponse[]>({ key });
				console.log('Cached connection obtained: ', cachedConnection);

				if (cachedConnection && Array.isArray(cachedConnection) && cachedConnection.length > 0) {
					return cachedConnection;
				}
			} catch (error) {
				console.error('Error getting from cache:', error);
				// Continuamos con la consulta a BD si falla el cache
			}
		}

		try {
			const connectionsResult = await db.query.connections.findMany({
				where: and(
					userId ? eq(connections.createdBy, userId) : undefined,
					filterByConnectedWith ? eq(connections.connectedWith, filterByConnectedWith) : undefined,
					filterByMetadata ? createJsonbCondition(connections.metadata, filterByMetadata) : undefined,
					type ? eq(connections.type, type as 'organizational' | 'direct') : undefined
				),
				with: {
					subscriptions: withSubscriptions ? true : undefined,
				},
			});

			const parsedConnections = selectConnectionSchema.array().parse(connectionsResult);

			// Si se filtró por connectedWith, actualizamos el cache
			if (filterByConnectedWith && parsedConnections.length > 0) {
				await updateConnectionCache(parsedConnections[0], env);
			}

			return parsedConnections;
		} catch (error) {
			console.error('Error fetching connections:', error);
			throw error;
		}
	},

	createConnection: async (env, db, data, userData) => {
		const saga = sagaPattern();

		try {
			const { organizationId, userId } = userData;
			console.log('DATOS DEL USER => ', userData);
			const { type } = data;

			if (!userId) throw new Error('Un usuario es requerido en la creación de las conexiones.');

			let newConnection: GetConnectionResponse;

			if (type === 'direct') {
				const [connection] = await db
					.insert(connections)
					.values({
						...data,
						createdBy: userId,
						organizationId,
					})
					.returning();

				if (!connection) {
					throw new Error('Failed to create connection.');
				}

				newConnection = connection;
			} else if (type === 'organizational') {
				console.log('DEIRA -> ', data);

				const { organizationalData } = data;
				console.log('ORG DATA => ', organizationalData);

				if (!organizationalData) {
					throw new Error('No hay datos organizacionales para conectar.');
				}

				console.log('WWWWWWWWW => ', data.organizationalData);
				console.log('KKKKKKKK <<< -> ', organizationalData);
				const connection = await db.transaction(async (tx) => {
					const [connection] = await tx
						.insert(connections)
						.values({
							...data,
							createdBy: userId,
							organizationId,
						})
						.returning();

					// Para las conexiones organizacionales asignamos el id del asistente al que se esta ligando.
					const subc = await tx
						.insert(connectionSubscriptions)
						.values({
							connectionId: connection.id,
							assistantId: organizationalData.assistantId,
							organizationId,
						})
						.returning();
					console.log('subccccccc ', subc);
					return connection;
				});

				console.log('LOS DATOS DEL USUARIO -< ', userData);
				// Eliminación de la conexión si ocurre algun error utilizando saga.
				saga.dispatch(async () => {
					try {
						await connectionHandlers.removeConnection(
							env,
							db,
							{
								id: connection.id,
								type: 'organizational',
							},
							userData
						);
					} catch (error) {
						console.error('Failed to delete organization from Auth0:', error);
					}
				});

				const connectionFlowResponse = await env.CHANNEL_SERVICES.organizationalConnectionFlow({
					provider: 'twilio',
					data: organizationalData as any,
					connectionId: connection.id,
					userData,
				});

				console.log('connectionFlowResponse -> ', connectionFlowResponse);

				if (!connectionFlowResponse.success) {
					throw new Error('Ha ocurrido un error en el flujo de conexión organizacional.');
				}

				newConnection = connection;
			} else {
				throw new Error('Invalid connection type.');
			}

			// Actualizar cache con la nueva conexión
			await updateConnectionCache(newConnection, env);

			return newConnection;
		} catch (error) {
			await saga.cancel();
			console.error('Error in createConnection:', error);
			throw error;
		}
	},

	updateConnection: async (env, db, data, userData) => {
		const { organizationId } = userData;

		try {
			// Si no hay campos para actualizar, devolvemos error
			if (Object.keys(data).length <= 1) {
				// Solo contiene el ID
				throw new Error('No fields to update provided.');
			}

			// Primero obtenemos la conexión actual para invalidar el cache con el connectedWith anterior
			const currentConnection = await db.query.connections.findFirst({
				where: and(eq(connections.id, data.id), eq(connections.organizationId, organizationId)),
			});

			if (!currentConnection) {
				throw new Error('Connection not found or you do not have permission to access it.');
			}

			// Invalidamos el cache de la conexión anterior
			await invalidateConnectionCache(currentConnection.connectedWith, env);

			const [updatedConnection] = await db
				.update(connections)
				.set(data)
				.where(and(eq(connections.id, data.id), eq(connections.organizationId, organizationId)))
				.returning();

			if (!updatedConnection) {
				throw new Error('Connection not found or you do not have permission to update it.');
			}

			// Actualizamos el cache con la conexión actualizada
			await updateConnectionCache(updatedConnection, env);

			return updatedConnection;
		} catch (error) {
			console.error('Error in updateConnection:', error);
			throw error;
		}
	},

	removeConnection: async (env, db, data, userData) => {
		const { organizationId } = userData;
		const { id, type } = data;

		try {
			// Primero obtenemos la conexión para invalidar el cache
			const connectionToDelete = await db.query.connections.findFirst({
				where: and(eq(connections.id, id), eq(connections.organizationId, organizationId)),
			});

			if (!connectionToDelete) {
				throw new Error('Connection not found or you do not have permission to access it.');
			}

			// Invalidamos el cache antes de eliminar
			await invalidateConnectionCache(connectionToDelete.connectedWith, env);

			const [removedConnection] = await db
				.delete(connections)
				.where(and(eq(connections.id, id), eq(connections.organizationId, organizationId)))
				.returning({ id: connections.id });

			// El tipo de conexion organizacional eliminara más datos.
			if (type === 'organizational') {
				console.log('CONEXION EMPRESARIAL...');
			}

			return removedConnection;
		} catch (error) {
			console.error('Error in removeConnection:', error);
			throw error;
		}
	},

	// Tabla: connection_subscriptions
	createConnectionSubscription: async (env, db, data, userData) => {
		const { organizationId } = userData;
		try {
			const [newConnectionSubscription] = await db
				.insert(connectionSubscriptions)
				.values({ ...data, organizationId })
				.returning();

			// Si la suscripción afecta una conexión existente, invalidamos su cache
			if (data.connectionId) {
				const connection = await db.query.connections.findFirst({
					where: eq(connections.id, data.connectionId),
				});

				if (connection) {
					await invalidateConnectionCache(connection.connectedWith, env);
				}
			}

			return { id: newConnectionSubscription.id };
		} catch (error) {
			console.error('Error in createConnectionSubscription:', error);
			throw error;
		}
	},

	removeConnectionSubscription: async (env, db, data, userData) => {
		const { organizationId } = userData;
		const { actionId, assistantId } = data;

		if (!actionId && !assistantId) {
			throw new Error('Se requiere al menos actionId o assistantId.');
		}

		const condition = actionId ? eq(connectionSubscriptions.actionId, actionId) : eq(connectionSubscriptions.assistantId, assistantId!);

		try {
			// Obtenemos la suscripción para encontrar la conexión relacionada
			const subscriptionToDelete = await db.query.connectionSubscriptions.findFirst({
				where: and(condition, eq(connectionSubscriptions.organizationId, organizationId)),
				with: {
					connection: true,
				},
			});

			const [removed] = await db
				.delete(connectionSubscriptions)
				.where(and(condition, eq(connectionSubscriptions.organizationId, organizationId)))
				.returning({ id: connectionSubscriptions.id });

			if (!removed) {
				throw new Error('Suscripción no encontrada o sin permisos.');
			}

			// Invalidamos el cache de la conexión relacionada si existe
			if (subscriptionToDelete?.connection) {
				await invalidateConnectionCache(subscriptionToDelete.connection.connectedWith, env);
			}

			return removed;
		} catch (error) {
			console.error('Error in removeConnectionSubscription:', error);
			throw error;
		}
	},
};

/**
 * MANEJADORES DE CACHE PARA CONNECTIONS.
 */

/**
 * Genera la clave de cache para una conexión basada en su connectedWith
 */
function getConnectionCacheKey(connectedWith: string, env: any): string {
	const { cacheKeyBuilder } = cacheHandler(env, '');
	return cacheKeyBuilder.entity({ name: connectedWith }).build();
}

/**
 * Invalida el cache de una conexión
 */
async function invalidateConnectionCache(connectedWith: string, env: any): Promise<void> {
	try {
		const { cacheManager } = cacheHandler(env, '');
		const key = getConnectionCacheKey(connectedWith, env);
		await cacheManager.delete({ key });
		console.log(`Cache invalidated for connection: ${connectedWith}`);
	} catch (error) {
		console.error('Error invalidating connection cache:', error);
		// No lanzamos el error para no interrumpir la operación principal
	}
}

/**
 * Actualiza el cache de una conexión
 */
async function updateConnectionCache(connection: GetConnectionResponse, env: any): Promise<void> {
	try {
		const { cacheManager } = cacheHandler(env, '');
		const key = getConnectionCacheKey(connection.connectedWith, env);

		// Almacenamos como array para mantener consistencia con getConnections
		await cacheManager.put({
			key,
			value: [connection],
			// TTL opcional - puedes ajustar según tus necesidades
			expirationTtl: 3600, // 1 hora
		});
		console.log(`Cache updated for connection: ${connection.connectedWith}`);
	} catch (error) {
		console.error('Error updating connection cache:', error);
		// No lanzamos el error para no interrumpir la operación principal
	}
}
