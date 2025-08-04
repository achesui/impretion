import { UserData } from '..';
import { DrizzleDb } from '../../controller/db.schema';
import {
	AssistantUpdateConfigurationSchema,
	AssistantUpdatePromptSchema,
	CreateOrDeleteAssistantLinkedActionSchema,
	SelectAssistantSchema,
} from '../../controller/validations';

// RESPUESTAS
export type GetAssistantsResponse = SelectAssistantSchema[];

export type UpdateAssistantPromptResponse = { id: string };

export type UpdateAssistantLinkedActionResponse = { id: string };

// PARAMETROS
export type GetAssistantsParams = {
	id?: string;
	withLinkedActions?: boolean;
	withLinkedCollections?: boolean;
	withPersonalities?: boolean;
};

export type UpdateAssistantParams = AssistantUpdatePromptSchema;

export type UpdateAssistantActionsParams = CreateOrDeleteAssistantLinkedActionSchema;

export type UpdateAssistantConfiguration = AssistantUpdateConfigurationSchema;

// Tipos de Handlers para Assistants
export type AssistantHandlers = {
	getAssistants: (env: Env, db: DrizzleDb, data: GetAssistantsParams, userData: UserData) => Promise<GetAssistantsResponse>;
	updateAssistantPrompt: (
		env: Env,
		db: DrizzleDb,
		data: UpdateAssistantParams,
		userData: UserData
	) => Promise<UpdateAssistantPromptResponse>;
	updateAssistantActions: (
		env: Env,
		db: DrizzleDb,
		data: UpdateAssistantActionsParams,
		userData: UserData
	) => Promise<UpdateAssistantLinkedActionResponse>;
	updateAssistantConfiguration: (env: Env, db: DrizzleDb, data: UpdateAssistantConfiguration, userData: UserData) => Promise<void>;
};

export type AssistantQueryProps =
	| { method: 'getAssistants'; data: GetAssistantsParams }
	| { method: 'updateAssistantPrompt'; data: UpdateAssistantParams }
	| { method: 'updateAssistantActions'; data: UpdateAssistantActionsParams }
	| { method: 'updateAssistantConfiguration'; data: UpdateAssistantConfiguration };
