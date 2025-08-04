import { SelectIntegrationSchema, SelectUserDataSchema, UpsertIntegrationSchema } from '../../controller/validations';
import { UserData } from '..';
import { DrizzleDb } from '../../controller/db.schema';

// ==== RESPUESTAS ====

export type UpsertIntegrationResponse = SelectIntegrationSchema | { accessToken: string };

export type DeleteIntegrationResponse = { id: string };

export type GetUserDataResponse = SelectUserDataSchema;

// ==== PARAMETROS ====

export type UpsertIntegrationParams = UpsertIntegrationSchema;

type GetUserDataParamsBase = { withConnections?: boolean };
export type GetUserDataParams =
	| (GetUserDataParamsBase & { withIntegrations?: false })
	| (GetUserDataParamsBase & { withIntegrations: true; service?: string; withAccessToken?: boolean; withRefreshToken?: boolean });

export type DeleteIntegrationParams = {
	id: string;
	service: string;
};

// ==== HANDLER ====

export type UserHandlers = {
	getUserData: (env: Env, db: DrizzleDb, data: GetUserDataParams, userData: UserData) => Promise<GetUserDataResponse | undefined>;
	createOrUpdateIntegration: (
		env: Env,
		db: DrizzleDb,
		data: UpsertIntegrationParams,
		userData: UserData
	) => Promise<UpsertIntegrationResponse>;
	deleteUserIntegration: (env: Env, db: DrizzleDb, data: DeleteIntegrationParams, userData: UserData) => Promise<DeleteIntegrationResponse>;
};

export type UserQueryProps =
	| { method: 'createOrUpdateIntegration'; data: UpsertIntegrationParams }
	| { method: 'getUserData'; data: GetUserDataParams }
	| { method: 'deleteUserIntegration'; data: DeleteIntegrationParams };
