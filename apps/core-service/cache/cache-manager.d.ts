// Este archivo se llama .d.ts debido a problemas con el worker de react con la conexión de service binding.
/**
 * Opciones específicas para cada operación
 */
type GetOptions = {
	key: string;
	withMetadata?: boolean;
};

type PutOptions<T = any, M = any> = {
	key: string;
	value: T | null;
	metadata?: M | null;
	expirationTtl?: number;
};

type DeleteOptions = {
	key: string;
};

type ListOptions = {
	prefix: string;
};

/**
 * Clase principal para manejar el cache
 */
export class CacheManager {
	private kvNamespace: KVNamespace;

	constructor(kvNamespace: KVNamespace) {
		this.kvNamespace = kvNamespace;
	}

	/**
	 * Obtiene un valor del cache
	 * @param key Clave del cache
	 * @returns Valor almacenado como generico o null si no existe
	 */
	async get<T>({ key, withMetadata = false }: GetOptions): Promise<T | null> {
		return withMetadata ? await this.kvNamespace.getWithMetadata(key) : await this.kvNamespace.get<T>(key, 'json');
	}

	/**
	 * Almacena un valor en el cache
	 * @param key Clave del cache
	 * @param value Valor a almacenar
	 */
	async put<T = any, M = any>({ key, value = null, metadata = null, expirationTtl }: PutOptions<T, M>): Promise<void> {
		// Función para limpiar metadata - Cloudflare requiere que el texto de metadata sea texto plano sin cáracteres especiales. Ej: tíldes, entre otros cáracteres.
		function sanitizeMetadata(meta: Record<string, any>) {
			if (!meta) return null;

			const sanitized: Record<string, any> = {};
			for (const [k, v] of Object.entries(meta)) {
				// Limpiar key y value de tildes
				const cleanKey = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
				const cleanValue = typeof v === 'string' ? v.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : v;

				sanitized[cleanKey] = cleanValue;
			}

			return sanitized;
		}

		let cleanMetadata;
		if (metadata) cleanMetadata = sanitizeMetadata(metadata);

		await this.kvNamespace.put(key, JSON.stringify(value), {
			metadata: cleanMetadata,
			expirationTtl,
		});
	}

	/**
	 * Elimina un valor del cache
	 * @param key Clave del cache
	 */
	async delete({ key }: DeleteOptions): Promise<void> {
		await this.kvNamespace.delete(key);
	}

	/**
	 * Lista valores por prefijo
	 * @param prefix Prefijo para filtrar
	 * @returns Array de valores que coinciden con el prefijo
	 */
	async list({ prefix }: ListOptions): Promise<KVNamespaceListResult<unknown, string>> {
		const listResult = await this.kvNamespace.list({ prefix });
		return listResult;
	}
}

// Ejemplos de uso:

/*
// Instanciar el cache manager
const cacheManager = new CacheManager(KV_NAMESPACE);

// Método nuevo (recomendado)
const user = await cacheManager.get<User>('user:123');
await cacheManager.put('user:123', { id: '123', name: 'John' });
await cacheManager.delete('user:123');
const users = await cacheManager.list<User>('user:');

// Método anterior (retrocompatible)
const user2 = await cacheManager.cache<User>({ 
  operation: 'get', 
  key: 'user:123' 
});

await cacheManager.cache({ 
  operation: 'put', 
  key: 'user:123', 
  value: { id: '123', name: 'John' } 
});

await cacheManager.cache({ 
  operation: 'delete', 
  key: 'user:123' 
});

const users2 = await cacheManager.cache<User>({ 
  operation: 'list', 
  prefix: 'user:' 
});
*/
