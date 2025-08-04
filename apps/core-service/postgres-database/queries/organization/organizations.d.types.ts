import { UserData } from '../../../../global';
import { DrizzleDb } from '../../controller/db.schema';
import { GetBalanceSchema, SelectBalanceSchema, UpdateBalanceTransactionSchema } from '../../controller/validations';

// ==== RESPUESTAS ====

type CustomQueryResponse = string;

type CreateOrganizationResponse = { organizationId: string; userId: string };

export type GetBalanceResponse = GetBalanceSchema;

// ==== PARAMETROS ====

type CustomQueryParams = {
	query: string;
};

type GetBalanceParams = {
	currency: string;
};

type CreateOrganizationParams = {
	organizationDisplayName: string;
};

type UpdateOrganizationBalanceParams = UpdateBalanceTransactionSchema;

// ==== HANDLER ====

export type OrganizationHandlers = {
	createOrganization: (env: Env, db: DrizzleDb, data: CreateOrganizationParams, userData: UserData) => Promise<CreateOrganizationResponse>;
	updateOrganizationBalance: (env: Env, db: DrizzleDb, data: UpdateOrganizationBalanceParams, userData: UserData) => Promise<void>;
	getOrganizationBalance: (env: Env, db: DrizzleDb, data: GetBalanceParams, userData: UserData) => Promise<GetBalanceResponse>;
	customQuery: (env: Env, db: DrizzleDb, data: CustomQueryParams, userData: UserData) => Promise<CustomQueryResponse>;
};

export type OrganizationQueryProps =
	| { method: 'customQuery'; data: CustomQueryParams }
	| { method: 'createOrganization'; data: CreateOrganizationParams }
	| { method: 'getOrganizationBalance'; data: GetBalanceParams }
	| { method: 'updateOrganizationBalance'; data: UpdateOrganizationBalanceParams };
