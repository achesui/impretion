// Este archivo se llama .d.ts debido a problemas con el worker de react con la conexión de service binding.
import { CacheKeyBuilder } from './cache-keys-builder.d.js';
import { CacheManager } from './cache-manager.d.js';
/**
 * Generador de llaves de cache para aplicaciones multitenant con estructura jerárquica
 *
 * Estructura flexible: organization:<org_id>:<path_segments>
 *
 * Ejemplos:
 * - organization:org_123:collections:coll_abc
 * - organization:org_123:users:user_456
 * - organization:org_123:users:user_456:collections:coll_123
 * - organization:org_123:users:user_456:settings:notifications
 * - organization:org_123:assistants:asst_789:conversations:conv_456
 */

type CacheKeyOptions = {
	organizationId: string;
	segments: string[];
};

type CacheKeySegment = {
	entity: string;
	identifier?: string;
};

type HierarchicalCacheKeyOptions = {
	organizationId: string;
	segments: CacheKeySegment[];
};

type EntityProps = {
	name: string;
	identifier?: string;
};

export type CacheKeyBuilderProps =
	| { type: 'getCache'; data: HierarchicalCacheKeyOptions; withMetadata: boolean }
	| { type: 'getCacheList'; data: HierarchicalCacheKeyOptions };

export function generateCacheKey({ organizationId, segments }: CacheKeyOptions): string {
	const base = `organization:${organizationId}`;
	const path = segments.join(':');
	return `${base}:${path}`;
}

/**
 * Generador de cache key con estructura de segmentos
 * Más legible para casos complejos
 */
export function generateHierarchicalCacheKey({ organizationId, segments }: HierarchicalCacheKeyOptions): string {
	const base = `organization:${organizationId}`;

	const pathSegments = segments.flatMap((segment) => (segment.identifier ? [segment.entity, segment.identifier] : [segment.entity]));

	return `${base}:${pathSegments.join(':')}`;
}

/**
 * Generador de prefijos para filtrado jerárquico
 */
export function generateHierarchicalPrefix({ organizationId, segments }: HierarchicalCacheKeyOptions): string {
	const key = generateHierarchicalCacheKey({ organizationId, segments });
	return `${key}:`;
}

/**
 * Builder pattern para construcción fluida de keys
 */
export class CacheKeyBuilder {
	private organizationId: string;
	private segments: CacheKeySegment[] = [];

	constructor(organizationId: string) {
		this.organizationId = organizationId;
	}

	entity({ name, identifier }: EntityProps): CacheKeyBuilder {
		this.segments.push({ entity: name, identifier });
		return this;
	}

	build(): string {
		return generateHierarchicalCacheKey({
			organizationId: this.organizationId,
			segments: this.segments,
		});
	}

	buildPrefix(): string {
		return generateHierarchicalPrefix({
			organizationId: this.organizationId,
			segments: this.segments,
		});
	}
}

// Ejemplos de uso:

// Método 1: Array de strings simple
/*
const key1 = generateCacheKey({
  organizationId: 'org_123',
  segments: ['users', 'user_456', 'collections', 'coll_123']
});
// Resultado: "organization:org_123:users:user_456:collections:coll_123"
*/

// Método 2: Estructura de segmentos (más expresiva)
/*
const key2 = generateHierarchicalCacheKey({
  organizationId: 'org_123',
  segments: [
    { entity: 'users', identifier: 'user_456' },
    { entity: 'collections', identifier: 'coll_123' }
  ]
});
// Resultado: "organization:org_123:users:user_456:collections:coll_123"
*/

// Método 3: Builder pattern (más fluido)
/*
const key3 = new CacheKeyBuilder('org_123')
  .entity('users', 'user_456')
  .entity('collections', 'coll_123')
  .build();
// Resultado: "organization:org_123:users:user_456:collections:coll_123"

// Para prefijos de filtrado
const prefix = new CacheKeyBuilder('org_123')
  .entity('users', 'user_456')
  .entity('collections')
  .buildPrefix();
// Resultado: "organization:org_123:users:user_456:collections:"
// Usar como: KV.list({ prefix })
*/

// Más ejemplos:
/*
// Configuración de usuario específico
const userSettingsKey = new CacheKeyBuilder('org_123')
  .entity('users', 'user_456')
  .entity('settings')
  .build();
// "organization:org_123:users:user_456:settings"

// Conversación específica de un asistente
const conversationKey = new CacheKeyBuilder('org_123')
  .entity('assistants', 'asst_789')
  .entity('conversations', 'conv_456')
  .build();
// "organization:org_123:assistants:asst_789:conversations:conv_456"

// Listar todas las collections de un usuario
const userCollectionsPrefix = new CacheKeyBuilder('org_123')
  .entity('users', 'user_456')
  .entity('collections')
  .buildPrefix();
// "organization:org_123:users:user_456:collections:"
*/
