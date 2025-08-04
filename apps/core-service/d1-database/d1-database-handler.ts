import { ServiceResponse } from '../../global';
import { logHandlers } from './queries/logs';
import { D1DatabaseQueryProps } from './queries';

// Mapa de handlers por tipo
const handlerMap = {
	logs: logHandlers,
} as const;

/**
 * Query Handler central que dirige las consultas a los handlers específicos
 * @param params - Parámetros de la consulta con tipo, userData y query
 * @param db - Instancia de la base de datos Drizzle
 * @param env - Variables de entorno de Cloudflare
 * @returns Promise con ServiceResponse
 */
export async function D1DatabaseQueryHandler(params: D1DatabaseQueryProps, env: Env): Promise<ServiceResponse<any, any>> {
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
		const result = await handler(env, data, userData);

		return {
			success: true,
			data: result,
		};
	} catch (error) {
		console.error('QueryHandler: Error procesando query:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Error desconocido en queryHandler',
		};
	}
}
