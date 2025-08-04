import { ServiceResponse } from '../../global';
import { assistantHandlers } from './queries/assistants';
import { actionHandlers } from './queries/actions';
import { connectionHandlers } from './queries/connections';
import { userHandlers } from './queries/users/users';
import { DrizzleDb } from './controller/db.schema';
import { MainDatabaseQueryProps } from './queries';
import { organizationHandlers } from './queries/organization';
import { knowledgeBaseHandlers } from './queries/knowledge-base';
import { transactionHandlers } from './queries/transactions/transactions';
// Mapa de handlers por tipo
const handlerMap = {
	assistants: assistantHandlers,
	actions: actionHandlers,
	connections: connectionHandlers,
	users: userHandlers,
	knowledgeBase: knowledgeBaseHandlers,
	transactions: transactionHandlers,
	organizations: organizationHandlers,
} as const;

/**
 * Query Handler central que dirige las consultas a los handlers específicos
 * @param params - Parámetros de la consulta con tipo, userData y query
 * @param db - Instancia de la base de datos Drizzle
 * @param env - Variables de entorno de Cloudflare
 * @returns Promise con ServiceResponse
 */
export async function mainDatabaseQueryHandler(
	params: MainDatabaseQueryProps,
	db: DrizzleDb,
	env: Env
): Promise<ServiceResponse<any, any>> {
	try {
		const { type, userData, query } = params;
		const { method, data } = query;

		// Obtiene el handler correspondiente al tipo
		const handlers = handlerMap[type];
		if (!handlers) {
			return {
				success: false,
				error: `Tipo de query '${type}' no soportado`,
			};
		}

		// Obtiene el método específico del handler
		const handler = handlers[method as keyof typeof handlers] as any;

		if (!handler) {
			return {
				success: false,
				error: `Método '${method}' no encontrado en ${type}Handlers`,
			};
		}

		// Ejecuta el handler
		const result = await handler(env, db, data, userData);

		return {
			success: true,
			data: result,
		};
	} catch (error) {
		console.error('QueryHandler: Error procesando query:', error);
		if (error instanceof Error && 'name' in error) {
			return {
				success: false,
				// Propagamos un objeto que coincide con tu tipo `ErrorDetails`
				error: {
					name: error.name,
					message: error.message,
				},
			};
		}

		// Si es un error desconocido que no tiene `name` o `message`, devolvemos un genérico.
		return {
			success: false,
			error: {
				name: 'UNKNOWN_ERROR',
				message: 'Error desconocido en queryHandler',
			},
		};
	}
}
