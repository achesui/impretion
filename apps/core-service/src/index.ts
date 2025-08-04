import { WorkerEntrypoint } from 'cloudflare:workers';
import { MainDatabaseQueryProps } from '../postgres-database/queries';
import { ServiceResponse, ErrorDetails } from '../../global';
import { Hono } from 'hono';
import { drizzleClient } from '../postgres-database/controller';
import { mainDatabaseQueryHandler } from '../postgres-database/main-database-handler';
import { JWKS } from '../postgres-database/lib/authenticated-user/jwks';
import { CacheKeyBuilderProps, generateHierarchicalCacheKey, generateHierarchicalPrefix } from '../cache/cache-keys-builder.d.js';
import { cacheHandler } from '../cache/cache-handler.d.js';
import { D1DatabaseQueryProps } from '../d1-database/queries';
import { D1DatabaseQueryHandler } from '../d1-database/d1-database-handler';

export default class CoreService extends WorkerEntrypoint<Env> {
	private app = new Hono<{ Bindings: Env }>();

	constructor(ctx: ExecutionContext, env: Env) {
		super(ctx, env);
		this.setupRoutes();
	}

	async fetch(request: Request): Promise<Response> {
		console.log('Test core-service');
		return this.app.fetch(request, this.env, this.ctx);
	}

	private setupRoutes() {
		this.app.get('/test', async (c) => {
			try {
				this.mainDatabaseHandler({
					type: 'assistants',
					query: {
						method: 'getAssistants',
						data: {
							id: '',
							withPersonalities: true,
						},
					},
					userData: {
						organizationId: '',
					},
				});
			} catch (error) {}

			return c.json({ x: 'hola mundo' });
		});

		/**
		 * Endpoint JWKS (JSON Web Key Set).
		 * Expone la clave pública para que servicios como Neon RLS puedan verificar
		 * las firmas de los JWT generados por esta aplicación.
		 * Sigue el estándar RFC 7517.
		 */
		this.app.get('/.well-known/jwks.json', async (c) => {
			const response = JWKS(c);
			const debugResponse = response.clone();

			try {
				const responseBodyText = await debugResponse.text(); // Leemos el cuerpo como texto
				console.log(responseBodyText);
			} catch (e) {
				console.error('❌ No se pudo leer el body de la respuesta para depurar:', e);
			}

			return response;
		});
	}

	async mainDatabaseHandler(params: MainDatabaseQueryProps): Promise<ServiceResponse<{}, ErrorDetails>> {
		const { db, end } = drizzleClient(this.env);

		try {
			const result = await mainDatabaseQueryHandler(params, db, this.env);
			return result;
		} catch (error) {
			console.error('CoreService: Unhandled error in mainDatabaseHandler:', error);
			return {
				success: false,
				error: {
					name: 'UNKNOWN_ERROR',
					message: 'Error desconocido en la raíz del servicio principal (core-service).',
				},
			};
		} finally {
			this.ctx.waitUntil(end());
		}
	}

	async D1DatabasesHandler(params: D1DatabaseQueryProps): Promise<ServiceResponse<{}, ErrorDetails>> {
		try {
			const result = await D1DatabaseQueryHandler(params, this.env);
			return result;
		} catch (error) {
			console.error('CoreService: Unhandled error in mainDatabaseHandler:', error);
			return {
				success: false,
				error: {
					name: 'UNKNOWN_ERROR',
					message: 'Error desconocido en la raíz del servicio principal (core-service).',
				},
			};
		}
	}

	/**
	 * Metodo que se usara ÚNICAMENTE para la LECTURA del cache, la escritura es manejada directamente por el sistema de baso de datos.
	 * Si no se encuentra ningún dato 'success' sera 'false'
	 * @param params
	 */
	async storageCacheHandler(params: CacheKeyBuilderProps): Promise<ServiceResponse<{}, ErrorDetails>> {
		try {
			const { type, data } = params;
			const { organizationId, segments } = data;
			const { cacheManager } = cacheHandler(this.env, organizationId);

			switch (type) {
				case 'getCache':
					const { withMetadata } = params;

					const hierarchicalCacheKey = generateHierarchicalCacheKey({
						organizationId,
						segments,
					});
					console.log('hierarchicalCacheKey => ', hierarchicalCacheKey);
					const cachedData = await cacheManager.get({
						key: hierarchicalCacheKey,
						withMetadata,
					});
					console.log('CACHIEDDD => ', cachedData);

					if (!cachedData) throw new Error();

					return {
						success: true,
						data: cachedData,
					};

				case 'getCacheList':
					const hierarchicalPrefix = generateHierarchicalPrefix({
						organizationId,
						segments,
					});

					const listResult = await cacheManager.list({
						prefix: hierarchicalPrefix,
					});

					if (listResult.keys.length === 0) throw new Error();

					return {
						success: true,
						data: listResult,
					};

				default:
					throw new Error(`Unsupported operation: ${type}`);
			}
		} catch (error) {
			return {
				success: false,
				error: {
					name: 'UNKNOWN_ERROR',
					message: 'Error desconocido en la raíz del servicio principal (core-service).',
				},
			};
		}
	}
}
