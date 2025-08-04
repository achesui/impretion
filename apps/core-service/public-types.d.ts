/**
 * BASE DE DATOS POSTGRESQL
 */
// Exporta todas las posibles respuestas de las queries a los diferentes workers.
export type { GetBalanceResponse } from './postgres-database/queries/organization/organizations.types'; // Organizaciones
export type {
	GetActionByIdResponse,
	UpsertActionResponse,
	GetActionResultsResponse,
} from './postgres-database/queries/actions/actions.types'; // Acciones
export type { GetConnectionResponse } from './postgres-database/queries/connections/connections.types'; // Conexiones
export type {
	GetCollectionsResponse,
	GetCollectionContentsResponse,
	CreateOrDeleteCollectionContentSchemaResponse,
} from './postgres-database/queries/knowledge-base/knowledge-base.types'; // Conocimiento base
export type { GetProofOfPaymentResponse } from './postgres-database/queries/transactions/transactions.types'; // Transacciones
export type { GetAssistantsResponse } from './postgres-database/queries/assistants/assistants.types'; // Asistentes

// Las integraciones tienen validaciones diferentes en los returns.
export type { GetUserDataResponse } from './postgres-database/queries/users/users.types';
export type { SelectIntegrationSchema, SelectConnectionSubscriptionsSchema } from './postgres-database/controller/validations';

// Para las mutaciones que requieren los cambios optimista.
export type { UpsertCollectionSchema, InsertCollectionContentSchema } from './postgres-database/controller/validations';
export type { AssistantUpdatePromptSchema } from './postgres-database/controller/validations';

/**
 * BASE DE DATOS D1
 */
// Exporta todas las posibles respuestas de las queries a los diferentes workers.
export type {
	GetQueuedBatchesResponse,
	GetOrganizationsCountResponse,
	GetClaimedWorkAggregationResponse,
	GenerateSyntheticLogsResponse,
} from './d1-database/queries/logs/logs.types';

// Para las operaciones de UPDATE/DELETE, D1 devuelve este objeto.
export type { D1MutationResponse } from './d1-database/queries/index';

/**
 * EXPORTACIÓN GENERAL DE TIPOS
 */

// Formato de respuestas cache KV Cloudflare
export type { GetCacheList } from './cache/cache-handler';
