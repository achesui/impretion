// Este archivo se llama .d.ts debido a problemas con el worker de react con la conexión de service binding.
import { CacheKeyBuilder } from './cache-keys-builder.d.js';
import { CacheManager } from './cache-manager.d.js';

// Tipos necesarios para el funcionamiento del cache
export type GetCacheList<T> = {
	keys: {
		name: string;
		metadata: T;
	}[];
};

export function cacheHandler(env: Env, organizationId: string): { cacheManager: CacheManager; cacheKeyBuilder: CacheKeyBuilder } {
	return { cacheManager: new CacheManager(env.DATABASE_CACHE), cacheKeyBuilder: new CacheKeyBuilder(organizationId) };
}
