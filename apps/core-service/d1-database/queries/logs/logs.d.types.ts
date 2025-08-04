// --- core-service/d1-database/types/logs.d.types.ts ---
// ==== RESPUESTAS (Lo que cada método devuelve) ====

export type GetQueuedBatchesResponse = { processing_batch_id: string }[];
export type GetOrganizationsCountResponse = { total_orgs: number };
export type GetClaimedWorkAggregationResponse = { organization_id: string; total_cost_in_units: number }[];
export type D1MutationResponse = { success: boolean; changes: number; lastRowId: number | null };
export type GenerateSyntheticLogsResponse = {
	message: string;
	recordCount: number;
};
export type InsertLogsIntoD1Response = void;

// ==== PARÁMETROS (Lo que cada método necesita) ====

export type GetQueuedBatchesParams = {};
export type GetOrganizationsCountParams = { batchId: string };
export type ClaimPendingWorkBatchParams = { newBatchId: string };
export type GetClaimedWorkAggregationParams = { batchId: string };
export type ConfirmBatchEnqueuedParams = { batchId: string };
export type RollbackClaimedBatchParams = { batchId: string };
export type FinalizeProcessedBatchParams = { batchId: string };
export type GenerateSyntheticLogsParams = {};
export type InsertLogsIntoD1Params = {
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
}[];

// ==== HANDLER (El contrato completo para todas las operaciones de logs) ====

export type LogHandlers = {
	getQueuedBatches: (env: Env, data: GetQueuedBatchesParams) => Promise<GetQueuedBatchesResponse>;
	getOrganizationsCount: (env: Env, data: GetOrganizationsCountParams) => Promise<GetOrganizationsCountResponse>;
	claimPendingWorkBatch: (env: Env, data: ClaimPendingWorkBatchParams) => Promise<D1MutationResponse>;
	getClaimedWorkAggregation: (env: Env, data: GetClaimedWorkAggregationParams) => Promise<GetClaimedWorkAggregationResponse>;
	confirmBatchEnqueued: (env: Env, data: ConfirmBatchEnqueuedParams) => Promise<D1MutationResponse>;
	rollbackClaimedBatch: (env: Env, data: RollbackClaimedBatchParams) => Promise<D1MutationResponse>;
	finalizeProcessedBatch: (env: Env, data: FinalizeProcessedBatchParams) => Promise<D1MutationResponse>;
	generateSyntheticLogs: (env: Env, data: GenerateSyntheticLogsParams) => Promise<GenerateSyntheticLogsResponse>;
	insertLogsIntoD1: (env: Env, data: InsertLogsIntoD1Params) => Promise<InsertLogsIntoD1Response>;
};

// ==== PROPS DE QUERY (La unión discriminada para el enrutador) ====

export type LogQueryProps =
	| { method: 'getQueuedBatches'; data: GetQueuedBatchesParams }
	| { method: 'getOrganizationsCount'; data: GetOrganizationsCountParams }
	| { method: 'claimPendingWorkBatch'; data: ClaimPendingWorkBatchParams }
	| { method: 'getClaimedWorkAggregation'; data: GetClaimedWorkAggregationParams }
	| { method: 'confirmBatchEnqueued'; data: ConfirmBatchEnqueuedParams }
	| { method: 'rollbackClaimedBatch'; data: RollbackClaimedBatchParams }
	| { method: 'finalizeProcessedBatch'; data: FinalizeProcessedBatchParams }
	| { method: 'generateSyntheticLogs'; data: GenerateSyntheticLogsParams }
	| { method: 'insertLogsIntoD1'; data: InsertLogsIntoD1Params };
