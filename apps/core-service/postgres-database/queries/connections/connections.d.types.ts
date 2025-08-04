import { UserData } from '../../../../global';
import { JsonFilter } from '../../../types';
import { DrizzleDb } from '../../controller/db.schema';
import {
	ConnectionTypeEnumSchema,
	CreateConnectionSchema,
	CreateConnectionSubscriptionSchema,
	RemoveConnectionSchema,
	SelectConnectionSchema,
	UpdateConnectionSchema,
	UpsertConnectionSchema,
} from '../../controller/validations';

// ==== RESPUESTAS ====

// Tabla: connections
export type GetConnectionResponse = SelectConnectionSchema;
export type UpdateConnectionResponse = UpdateConnectionSchema;
export type CreateConnectionResponse = CreateConnectionSchema;
export type RemoveConnectionResponse = { id: string };

// Tabla: connectionSubscriptions
export type UpsertConnectionSubscriptionResponse = { id: string };
export type RemoveConnectionSubscriptionResponse = { id: string };

// ==== PARAMETROS ====

// Tabla: connections
export type GetConnectionParams = {
	filterByConnectedWith?: string;
	filterByMetadata?: JsonFilter;
	withSubscriptions?: boolean;
	type?: ConnectionTypeEnumSchema;
};
export type CreateConnectionParams = CreateConnectionSchema;
export type UpdateConnectionParams = UpdateConnectionSchema;
export type RemoveConnectionParams = RemoveConnectionSchema;

// Tabla: connectionSubscriptions
export type CreateConnectionSubscriptionParams = CreateConnectionSubscriptionSchema;
export type RemoveConnectionSubscriptionParams = { actionId?: string; assistantId?: string };

// ==== HANDLER ====

export type ConnectionHandlers = {
	getConnections: (env: Env, db: DrizzleDb, data: GetConnectionParams, userData: UserData) => Promise<GetConnectionResponse[] | undefined>;
	createConnection: (env: Env, db: DrizzleDb, data: CreateConnectionParams, userData: UserData) => Promise<CreateConnectionResponse>;
	updateConnection: (env: Env, db: DrizzleDb, data: UpdateConnectionParams, userData: UserData) => Promise<UpdateConnectionResponse>;
	removeConnection: (env: Env, db: DrizzleDb, data: RemoveConnectionParams, userData: UserData) => Promise<RemoveConnectionResponse>;
	createConnectionSubscription: (
		env: Env,
		db: DrizzleDb,
		data: CreateConnectionSubscriptionParams,
		userData: UserData
	) => Promise<UpsertConnectionSubscriptionResponse>;
	removeConnectionSubscription: (
		env: Env,
		db: DrizzleDb,
		data: RemoveConnectionSubscriptionParams,
		userData: UserData
	) => Promise<RemoveConnectionSubscriptionResponse>;
};

export type ConnectionQueryProps =
	| { method: 'getConnections'; data: GetConnectionParams }
	| { method: 'createConnection'; data: CreateConnectionParams }
	| { method: 'updateConnection'; data: UpdateConnectionParams }
	| { method: 'removeConnection'; data: RemoveConnectionParams }
	| { method: 'createConnectionSubscription'; data: CreateConnectionSubscriptionParams };
