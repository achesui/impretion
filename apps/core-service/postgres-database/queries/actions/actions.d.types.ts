import { DrizzleDb } from '../../controller/db.schema';
import {
	GetActionsSchema,
	SelectActionConfigurationSchema,
	SelectActionResultSchema,
	SelectActionSchema,
	SelectActionStructureSchema,
	UpsertActionResultSchema,
	UpsertActionSchema,
} from '../../controller/validations';
import { UserData } from '..';

// ==== RESPUESTAS ====

export type GetActionByIdResponse = GetActionsSchema;

export type UpsertActionResponse = { operation: string };

export type GetActionResultsResponse = SelectActionResultSchemaz;

type EditActionConfigurationResponse = string;

// ==== PARAMETROS ====

export type GetActionsParams = {
	actionId?: string;
	type: string;
	withConfiguration?: boolean;
	withStructure?: boolean;
};

export type GetActionResultsParams = {
	id: string;
	filterResult?: JsonFilter;
};

type EditActionConfigurationParams = {
	schema: Record<string, any>;
	currentActionConfigurationSchema: Record<string, any>;
	actionId: string;
};

export type UpsertActionParams = UpsertActionSchema;

export type UpsertActionResultParams = UpsertActionResultSchema;

// ==== HANDLER ====

export type ActionHandlers = {
	getActions: (env: Env, db: DrizzleDb, data: GetActionsParams, userData: UserData) => Promise<GetActionsResponse>;
	getActionResults: (
		env: Env,
		db: DrizzleDb,
		data: GetActionResultsParams,
		userData: UserData
	) => Promise<GetActionResultsResponse[] | undefined>;
	createOrUpdateActionResult: (
		env: Env,
		db: DrizzleDb,
		data: UpsertActionResultParams,
		userData: UserData
	) => Promise<GetActionResultsResponse>;
	createOrUpdateAction: (env: Env, db: DrizzleDb, data: UpsertActionParams, userData: UserData) => Promise<UpsertActionResponse>;
	editActionConfigurationQuery: (
		env: Env,
		db: DrizzleDb,
		data: EditActionConfigurationParams,
		userData: UserData
	) => Promise<EditActionConfigurationResponse>;
};

export type ActionQueryProps =
	| { method: 'getActions'; data: GetActionsParams }
	| { method: 'getActionById'; data: GetActionByIdParams }
	| { method: 'getActionResults'; data: GetActionResultsParams }
	| { method: 'createOrUpdateAction'; data: UpsertActionParams }
	| { method: 'editActionConfigurationQuery'; data: EditActionConfigurationParams }
	| { method: 'createOrUpdateActionResult'; data: UpsertActionResultParams };
