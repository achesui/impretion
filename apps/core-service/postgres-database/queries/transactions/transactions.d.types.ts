import { SelectCollectionSchema, UpsertCollectionSchema } from '@/db/validations';
import { UserData } from '..';
import { DrizzleDb } from '../../controller/db.schema';

// ==== RESPUESTAS ====

export type GetProofOfPaymentResponse = {
	batchId: string;
	completedCount: number;
}[];
export type setBalanceForOrganizationResponse = {};

// ==== PARAMETROS ====

type GetProofOfPaymentParams = { batchIdsToVerify: string[] };
type setBalanceForOrganizationParams = { jobId: string; batchId: string; totalCostInUnits: number };

// ==== HANDLER ====

export type TransactionHandlers = {
	getProofOfPayment: (env: Env, db: DrizzleDb, data: GetProofOfPaymentParams) => Promise<GetProofOfPaymentResponse>;
	setBalanceForOrganization: (env: Env, db: DrizzleDb, data: any, userData: UserData) => Promise<UpsertCollectionResponse>;
};

export type TransactionQueryProps =
	| { method: 'getProofOfPayment'; data: GetProofOfPaymentParams }
	| { method: 'setBalanceForOrganization'; data: setBalanceForOrganizationParams };
