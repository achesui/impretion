import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { assistantConfiguration, assistantPersonalities, assistants, linkedActions, linkedCollections } from './schema/assistants';
import { actionConfiguration, actionResults, actions, actionStructure } from './schema/actions';
import { zodJsonActionSchema, zodJsonConfigurationSchema } from './json-schemas-validations';
import {
	balances,
	balanceTransactions,
	collectionContent,
	collections,
	connections,
	connectionSubscriptions,
	connectionTypeEnum,
	integrations,
	users,
} from './schema/organizations';
import { z } from 'zod';

/* ============ organizations ============ */
const balanceSelectSchema = createSelectSchema(balances);
export type SelectBalanceSchema = z.infer<typeof balanceSelectSchema>;
const balanceTransactionSchema = createSelectSchema(balanceTransactions);
export type SelectBalanceTransactionSchema = z.infer<typeof balanceTransactionSchema>;

const balanceStructureSchema = balanceSelectSchema
	.pick({
		balanceInUsdCents: true,
		updatedAt: true,
	})
	.extend({
		rate: z.number(),
	});

const updateBalanceTransactionSchema = balanceTransactionSchema.pick({
	amountInUsdCents: true, // net_amount fx convert
	description: true, // Recarga xxx
	feeInUsdCents: true, // transaction_details.net_received_amount
	originalPaymentAmount: true, // net_amount
	originalPaymentCurrency: true, // currency_id
	type: true, // recharge
	fxRateUsed: true, // fx_rate usada en su menor unidad
	originalFeeAmount: true,
});

export type GetBalanceSchema = z.infer<typeof balanceStructureSchema>;
export type UpdateBalanceTransactionSchema = z.infer<typeof updateBalanceTransactionSchema>;

/* ============ actions ============ */

const actionSelectSchema = createSelectSchema(actions);
export type SelectActionSchema = z.infer<typeof actionSelectSchema>;

const actionSelectConfigurationSchema = createSelectSchema(actionConfiguration);
export type SelectActionConfigurationSchema = z.infer<typeof actionSelectConfigurationSchema>;

const actionSelectStructureSchema = createSelectSchema(actionStructure);
export type SelectActionStructureSchema = z.infer<typeof actionSelectStructureSchema>;

const actionSelectResultSchema = createSelectSchema(actionResults);
export type SelectActionResultSchema = z.infer<typeof actionSelectResultSchema>;

const actionInsertSchema = createInsertSchema(actions);
const actionStructureInsertSchema = createInsertSchema(actionStructure);
//const actionConfigurationInsertSchema = createInsertSchema(actionConfiguration);

const actionStructureSchema = actionStructureInsertSchema
	.pick({
		name: true,
		description: true,
	})
	.extend({
		actionSchema: zodJsonActionSchema,
	});

const actionSchema = actionInsertSchema.pick({
	returns: true,
	createdBy: true,
	type: true,
});

const actionConfigurationSchema = z.object({
	configuration: zodJsonConfigurationSchema,
});

export type ActionStructureSchema = z.infer<typeof actionStructureSchema>;
export type ActionSchema = z.infer<typeof actionSchema>;
export type ActionConfigurationSchema = z.infer<typeof actionConfigurationSchema>;

// Tipado para la obtención de acciones de forma dinamicajunto con sus complementos.
export const getActionsSchema = z.object({
	action: actionSelectSchema,
	configuration: actionSelectConfigurationSchema.optional(),
	structure: actionSelectStructureSchema.optional(),
});

export type GetActionsSchema = z.infer<typeof getActionsSchema>;

// Tipado para la creación / actionalización de acciones.
export const upsertActionSchema = z.discriminatedUnion('operation', [
	z.object({
		operation: z.literal('create'),
		values: z.object({
			action: actionSchema,
			actionConfiguration: actionConfigurationSchema,
			actionStructure: actionStructureSchema,
		}),
	}),
	z.object({
		operation: z.literal('update'),
		id: z.string(),
		values: z.object({
			actionConfiguration: actionConfigurationSchema,
			actionStructure: actionStructureSchema,
		}),
	}),
]);

// Tipado para la creación / actualización de resultado de acciones (action_result)
const actionResultCreateSchema = actionSelectResultSchema.omit({ organizationId: true, id: true }); // Todos los campos excepto organizationId el cual se pasa en userData e id
const actionResultUpdateSchema = actionSelectResultSchema
	.pick({
		status: true,
		metadata: true,
	})
	.partial();

export const upsertActionResultSchema = z.discriminatedUnion('operation', [
	z.object({
		operation: z.literal('create'),
		values: actionResultCreateSchema,
	}),
	z.object({
		operation: z.literal('update'),
		id: z.string(),
		values: actionResultUpdateSchema,
	}),
]);

export type UpsertActionResultSchema = z.infer<typeof upsertActionResultSchema>;
export type UpsertActionSchema = z.infer<typeof upsertActionSchema>;

/* ============ assistants ============ */

const assistantSelectSchema = createSelectSchema(assistants);
const linkedCollectionsSelectSchema = createSelectSchema(linkedCollections);
const linkedAssistantActionsSelectSchema = createSelectSchema(linkedActions);
const assistantConfigurationSelectSchema = createSelectSchema(assistantConfiguration);
const assistantPersonalitiesSelectSchema = createSelectSchema(assistantPersonalities);

// Esquema para la obtencion de asistentes con el action con structure y configuration opcionales
const actionWithDetailsSchema = actionSelectSchema.extend({
	structure: actionSelectStructureSchema.optional(),
	configuration: actionSelectConfigurationSchema.optional(),
});

const linkedActionWithDetailsSchema = z.object({
	linkedActionId: z.string().uuid(), // ID de la tabla linked_actions
	action: actionWithDetailsSchema, // Objeto completo de la acción
});

const assistantStructureSchema = assistantSelectSchema.extend({
	linkedActions: z.array(linkedActionWithDetailsSchema).optional(),
	linkedCollections: z.array(linkedCollectionsSelectSchema).optional(),
	configuration: assistantConfigurationSelectSchema.extend({
		personalities: assistantPersonalitiesSelectSchema.partial(),
	}),
});
export type SelectAssistantSchema = z.infer<typeof assistantStructureSchema>;

const assistantUpdateConfigurationSchema = z.object({
	updatePersonalities: z.object({
		id: z.string().uuid(),
		personalities: assistantPersonalitiesSelectSchema.partial(),
	}),
});
export type AssistantUpdateConfigurationSchema = z.infer<typeof assistantUpdateConfigurationSchema>;

// Esquemas de actualización de asistente

const createOrDeleteAssistantLinkedActionSchema = z.discriminatedUnion('operation', [
	z.object({
		operation: z.literal('create'),
		values: linkedAssistantActionsSelectSchema.pick({
			assistantId: true,
			actionId: true,
			actionType: true,
		}),
	}),
	z.object({
		operation: z.literal('delete'),
		id: z.string(), // Este será el linkedActionId
	}),
]);
export type CreateOrDeleteAssistantLinkedActionSchema = z.infer<typeof createOrDeleteAssistantLinkedActionSchema>;

const assistantUpdatePromptSchema = assistantSelectSchema
	.pick({
		prompt: true,
	})
	.partial();

const completeAssistantUpdateSchema = z.object({
	id: z.string().uuid('Invalid assistant ID'),
	assistantPrompt: assistantUpdatePromptSchema.optional(),
	linkedCollections: z.array(z.string().uuid('Invalid collection ID')).optional(),
});

export type AssistantUpdatePromptSchema = z.infer<typeof completeAssistantUpdateSchema>;

/* ============ connection_subscriptions ============ */

const insertConnectionSubscriptionSchema = createInsertSchema(connectionSubscriptions).omit({
	organizationId: true,
});
const selectConnectionSubscriptionSchema = createSelectSchema(connectionSubscriptions);

export type CreateConnectionSubscriptionSchema = z.infer<typeof insertConnectionSubscriptionSchema>;
export type SelectConnectionSubscriptionsSchema = z.infer<typeof selectConnectionSubscriptionSchema>;

/* ============ connections ============ */

const connectionTypeEnumSchema = createSelectSchema(connectionTypeEnum);
export type ConnectionTypeEnumSchema = z.infer<typeof connectionTypeEnumSchema>;

const insertConnectionSchema = createInsertSchema(connections)
	.extend({ organizationalData: z.record(z.string(), z.any()).optional() })
	.omit({ organizationId: true, createdBy: true });
const updateConnectionSchema = createUpdateSchema(connections).extend({ id: z.string() });
export const selectConnectionSchema = createSelectSchema(connections).extend({
	subscriptions: z.array(selectConnectionSubscriptionSchema).optional(),
});
const removeConnectionSchema = createSelectSchema(connections).pick({
	id: true,
	type: true,
});

export type UpdateConnectionSchema = z.infer<typeof updateConnectionSchema>;
export type CreateConnectionSchema = z.infer<typeof insertConnectionSchema>;
export type SelectConnectionSchema = z.infer<typeof selectConnectionSchema>;
export type RemoveConnectionSchema = z.infer<typeof removeConnectionSchema>;

/* ============ users ============ */

const insertIntegrationSchema = createInsertSchema(integrations);
const selectIntegrationSchema = createSelectSchema(integrations);
const selectUserSchema = createSelectSchema(users);

// Los parametros necesarios para la creación de una nueva integración, estos datos provienen del cliente (PKCE).
const availableIntegrations = ['calendly', 'auth0'] as const;
const integrationCreateSchema = z.object({
	code: z.string().min(1, 'Code is required'),
	redirectUri: z.string().min(1, 'Redirect URI is required').optional(),
	codeVerifier: z.string().min(1, 'Code verifier is required').optional(),
	clientId: z.string().min(1, 'Client ID is required').optional(),
	service: z.enum(availableIntegrations),
});

const integrationUpdateSchema = insertIntegrationSchema
	.pick({
		accessToken: true,
		expiresAt: true,
		refreshToken: true,
		updatedAt: true,
		service: true,
		createdAt: true,
	})
	.partial();

export const upsertIntegrationSchema = z.discriminatedUnion('operation', [
	z.object({
		operation: z.literal('create'),
		values: integrationCreateSchema,
	}),
	z.object({
		operation: z.literal('update'),
		id: z.string().uuid('Invalid integration ID'),
		values: integrationUpdateSchema,
	}),
]);

// Obtiene todos los datos necesarios de la tabla "integrations"
const getIntegrationDataSchema = selectIntegrationSchema.omit({
	userId: true,
	organizationId: true,
	accessToken: true,
	refreshToken: true,
});
export type SelectIntegrationSchema = z.infer<typeof getIntegrationDataSchema>;

export const userDataSchema = selectUserSchema.extend({
	integrations: z.array(selectIntegrationSchema.partial()),
});
export type SelectUserDataSchema = z.infer<typeof userDataSchema>;

export type UpsertIntegrationSchema = z.infer<typeof upsertIntegrationSchema>;

/* ============ collections ============ */

const insertCollectionSchema = createInsertSchema(collections).omit({ organizationId: true }); // Manejado desde userData.
const collectionSelectSchema = createSelectSchema(collections);

const collectionUpdateSchema = insertCollectionSchema
	.pick({
		description: true,
		name: true,
		totalSize: true,
		fileCount: true,
	})
	.partial();

export const upsertCollectionSchema = z.discriminatedUnion('operation', [
	z.object({
		operation: z.literal('create'),
		values: insertCollectionSchema,
	}),
	z.object({
		operation: z.literal('update'),
		id: z.string().uuid('Invalid collection ID'),
		values: collectionUpdateSchema,
	}),
]);

export type UpsertCollectionSchema = z.infer<typeof upsertCollectionSchema>;
export type SelectCollectionSchema = z.infer<typeof collectionSelectSchema>;

const insertCollectionContentSchema = createInsertSchema(collectionContent).omit({ organizationId: true });
const selectCollectionContentSchema = createSelectSchema(collectionContent);

export const createOrDeleteCollectionContentSchema = z.discriminatedUnion('operation', [
	z.object({
		operation: z.literal('create'),
		values: insertCollectionContentSchema,
	}),
	z.object({
		operation: z.literal('delete'),
		id: z.string().uuid('Invalid integration ID'),
	}),
]);

export type InsertCollectionContentSchema = z.infer<typeof insertCollectionContentSchema>;
export type CreateOrDeleteCollectionContentSchema = z.infer<typeof createOrDeleteCollectionContentSchema>;
export type SelectCollectionContentSchema = z.infer<typeof selectCollectionContentSchema>;
