import {
	CreateIntegrationSchema,
	SelectIntegrationSchema,
	SelectUserDataSchema,
	UpdateIntegrationSchema,
} from '../../controller/validations';
import { UserData } from '..';
import { DrizzleDb } from '../../controller/db.schema';

// ==== RESPUESTAS ====

// El access token se usa para obtención del dato en el servidor.
export type CreateIntegrationResponse = SelectIntegrationSchema | { accessToken: string };

export type DeleteIntegrationResponse = { id: string };

export type GetUserDataResponse = SelectUserDataSchema;

// ==== PARAMETROS ====

export type CreateIntegrationParams = CreateIntegrationSchema;
export type UpdateIntegrationParams = UpdateIntegrationSchema; // Falta.

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
	createIntegration: (env: Env, db: DrizzleDb, data: CreateIntegrationParams, userData: UserData) => Promise<UpsertIntegrationResponse>;
	deleteIntegration: (env: Env, db: DrizzleDb, data: DeleteIntegrationParams, userData: UserData) => Promise<DeleteIntegrationResponse>;
};

export type UserQueryProps =
	| { method: 'createIntegration'; data: CreateIntegrationParams }
	| { method: 'getUserData'; data: GetUserDataParams }
	| { method: 'deleteUserIntegration'; data: DeleteIntegrationParams };
