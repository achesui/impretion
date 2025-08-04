import { calculateCost } from '../lib/cost-handler';
import { readLines } from '../lib/crypto';
import { GenerateSyntheticLogsResponse } from '@core-service/types';

// Helper para generar un hash SHA-256, ideal para la clave de idempotencia.
// Esta función garantiza que cada línea de log única tenga un identificador único.
async function createIdempotencyKey(line: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(line);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

type D1Data = {
	inputTokens: number;
	outputTokens: number;
	cost: number;
	model: string;
	connectionType: string;
	to: string;
	from: string | null;
	organizationId: string;
	createdAt: string;
	status: string;
	idempotencyKey: string;
};

export type AIGatewayMetadata = {
	organizationId: string;
	connectionType: string;
	connectedWith: string;
	from: string | null;
	assistantId: string;
	isInternal: boolean;
	source: string;
};

// El export default ahora contiene tanto el manejador `queue` como un nuevo manejador `fetch` para desarrollo.
export default {
	/**
	 * Manejador de la Queue.
	 * Optimizado para rendimiento, robustez y manejo de errores.
	 */
	async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext): Promise<void> {
		// Acumular todos los logs para inserción en batch
		const allLogsForDb: D1Data[] = [];
		const processedMessages: any[] = [];

		for (const message of batch.messages) {
			try {
				const notification = message.body;
				const key = notification?.object?.key;

				if (!key) {
					console.error('Mensaje de la cola con formato inválido, descartando:', JSON.stringify(notification));
					message.ack();
					continue;
				}

				const object = await env.LOGS.get(key);
				if (!object) {
					console.error(`Archivo de log no encontrado en R2: ${key}. Descartando mensaje.`);
					message.ack();
					continue;
				}

				const decompressionStream = new DecompressionStream('gzip');
				const textStream = object.body.pipeThrough(decompressionStream).pipeThrough(new TextDecoderStream());

				for await (const line of readLines(textStream)) {
					try {
						const logEntry = JSON.parse(line);

						const { Metadata, ResponseBody, ...remaining } = logEntry;

						const [decryptMetadataResponse, decryptResponseBodyResponse] = await Promise.all([
							env.CRYPTO_SERVICE.decryptHybridPayload({
								keyIdentifier: 'LOGS_V1',
								payload: Metadata, // <-- Pasas el objeto Metadata aquí
							}),
							env.CRYPTO_SERVICE.decryptHybridPayload({
								keyIdentifier: 'LOGS_V1',
								payload: ResponseBody, // <-- Pasas el objeto ResponseBody aquí
							}),
						]);

						if (!decryptResponseBodyResponse.success || !decryptMetadataResponse.success) {
							console.error("No se ha podido desencriptar el 'ResponseBody' o 'Metadata'.");
							message.ack();
							continue;
						}

						const decryptedLog = {
							...remaining,
							Metadata: JSON.parse(decryptMetadataResponse.data), // <-- Usas el segundo resultado
							ResponseBody: JSON.parse(decryptResponseBodyResponse.data), // <-- Usas el primer resultado
						};

						// Extraer datos necesarios
						const metadata: AIGatewayMetadata = decryptedLog.Metadata;
						const responseBody = decryptedLog.ResponseBody;

						const { model, usage } = responseBody;
						const inputTokens = usage.prompt_tokens;
						const outputTokens = usage.completion_tokens;

						// Generar la clave de idempotencia a partir de la línea de log cruda.
						const idempotencyKey = await createIdempotencyKey(line);

						const cost = calculateCost({
							completionTokens: outputTokens,
							promptTokens: inputTokens,
							modelId: model,
							isInternal: metadata.isInternal,
							source: metadata.source,
						});

						// Construir objeto directamente sin función auxiliar innecesaria
						const logForDb: D1Data = {
							idempotencyKey,
							inputTokens,
							outputTokens,
							cost,
							model,
							connectionType: metadata.connectionType,
							/**
							 * Si es organizacional 'connectedWith' refiere a un contacto enlazado de la organización.
							 * Si es directo refiere al telefono del usuario conectado.
							 */
							to: metadata.connectedWith,
							from: metadata.connectionType === 'organizational' ? metadata.from : null,
							organizationId: metadata.organizationId,
							createdAt: new Date(responseBody.created * 1000).toISOString(),
							status: 'PENDING',
						};

						allLogsForDb.push(logForDb);
					} catch (lineError) {
						console.error(`Error procesando línea de log en archivo ${key}:`, lineError);
						// Continuar con la siguiente línea
					}
				}

				processedMessages.push(message);
				console.log(`Procesado archivo ${key} con ${allLogsForDb.length} logs acumulados.`);
			} catch (err) {
				console.error(`Error procesando mensaje de la cola (ID: ${message.id}):`, err);
				message.retry();
			}
		}

		// Inserción en batch de todos los logs procesados
		if (allLogsForDb.length > 0) {
			try {
				await env.CORE_SERVICE.D1DatabasesHandler({
					type: 'logs',
					query: {
						method: 'insertLogsIntoD1',
						data: allLogsForDb,
					},
					userData: {
						organizationId: '',
					},
				});
				console.log(`[SUCCESS] Insertados ${allLogsForDb.length} logs en D1 exitosamente.`);

				// Acknowledge todos los mensajes procesados exitosamente
				processedMessages.forEach((message) => message.ack());
			} catch (dbError) {
				console.error(`Error insertando logs en D1:`, dbError);
				// Retry todos los mensajes si falla la inserción
				processedMessages.forEach((message) => message.retry());
			}
		} else {
			console.log('No se encontraron logs procesables en ningún archivo.');
			// Acknowledge mensajes aunque no haya logs
			processedMessages.forEach((message) => message.ack());
		}
	},

	/**
	 * Manejador Fetch: Expone un endpoint para generar datos de prueba localmente.
	 * `curl http://localhost:8787/generate-synthetic-data`
	 */
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (env.ENVIRONMENT === 'dev') {
			console.log('ESPAIN => ', url.pathname);

			if (url.pathname === '/generate-synthetic-data') {
				try {
					console.log('[ETL-WORKER] Solicitando generación de datos sintéticos a core-service...');

					// 1. Llamada al servicio centralizado, ahora mucho más limpia.
					const response = await env.CORE_SERVICE.D1DatabasesHandler({
						type: 'logs',
						query: {
							method: 'generateSyntheticLogs',
							data: {},
						},
						userData: {
							organizationId: '',
						},
					});

					// 2. Patrón "Validar y Afirmar"
					if (!response.success) {
						console.error('[ETL-WORKER] La generación de datos en core-service falló:', response.error);
						return new Response(JSON.stringify(response.error), {
							status: 500,
							headers: { 'Content-Type': 'application/json' },
						});
					}

					// Afirmamos el tipo para poder acceder a 'data' de forma segura.
					const responseData = response.data as GenerateSyntheticLogsResponse;

					console.log(`[ETL-WORKER] Respuesta exitosa de core-service: ${responseData.message}`);
					return new Response(responseData.message, { status: 200 });
				} catch (error) {
					console.error('[ETL-WORKER] Error catastrófico al llamar a core-service:', error);
					return new Response('Error al comunicarse con el servicio principal.', { status: 502 });
				}
			}
			if (url.pathname === '/send-message') {
				const { key } = await request.json<{ key: string }>();

				await env.ETL_GENERATIONS.send({
					object: {
						key,
					},
				});

				return new Response('', { status: 200 });
			}
		}

		return new Response('Not Found.', { status: 404 });
	},
};
