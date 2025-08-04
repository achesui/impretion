import { boolean, check, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { collections, organizations, users } from './organizations';
import { actionResults, actions } from './actions';
import { relations, sql } from 'drizzle-orm';

export const assistantStatusEnum = pgEnum('assistant_status', ['active', 'inactive']);
export const complianceLevelEnum = pgEnum('compliance_level', ['standard', 'high', 'critical']);
export const verbosityEnum = pgEnum('verbosity_level', ['brief', 'normal', 'detailed']);

export const assistants = pgTable(
	'assistants',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		name: varchar('name', { length: 40 }).notNull(),
		description: varchar('description', { length: 150 }).notNull().default('Soy un asistente útil'),
		status: assistantStatusEnum('status').notNull().default('active'),
		isPublic: boolean('is_public').notNull().default(true),
		prompt: varchar('prompt', { length: 5000 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
	},
	(table) => [index('assistants_organization_id_idx').on(table.organizationId)]
);

export const assistantConfiguration = pgTable(
	'assistant_configuration',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		assistantId: uuid('assistant_id')
			.notNull()
			.references(() => assistants.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
	},
	(table) => [uniqueIndex('assistant_configuration_assistant_id_idx').on(table.assistantId)]
);

export const assistantPersonalities = pgTable(
	'assistant_personalities',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		friendliness: integer('friendliness').notNull().default(3),
		seriousness: integer('seriousness').notNull().default(3),
		empathy: integer('empathy').notNull().default(3),
		confidence: integer('confidence').notNull().default(3),
		professionalism: integer('professionalism').notNull().default(3),
		patience: integer('patience').notNull().default(3),
		curiosity: integer('curiosity').notNull().default(3),
		emojis: integer('emojis').notNull().default(0),
		verbosity: verbosityEnum('verbosity').notNull().default('normal'),
		complianceLevel: complianceLevelEnum('compliance_level').notNull().default('standard'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
		assistantConfigurationId: uuid('assistant_configuration_id')
			.notNull()
			.references(() => assistantConfiguration.id, { onDelete: 'cascade' }),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
	},
	(table) => [
		// Restricción para limitar los valores entre 0 y 5 inclusive
		check(
			'traits_range_check',
			sql`${table.friendliness} BETWEEN 0 AND 5
         AND ${table.seriousness} BETWEEN 0 AND 5
         AND ${table.empathy} BETWEEN 0 AND 5
         AND ${table.confidence} BETWEEN 0 AND 5
         AND ${table.professionalism} BETWEEN 0 AND 5
         AND ${table.patience} BETWEEN 0 AND 5
         AND ${table.curiosity} BETWEEN 0 AND 5
         AND ${table.emojis} BETWEEN 0 AND 5`
		),
	]
);

export const linkedCollections = pgTable(
	'linked_collections',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
		assistantId: uuid('assistant_id')
			.notNull()
			.references(() => assistants.id, { onDelete: 'cascade' }),
		collectionId: uuid('collection_id')
			.notNull()
			.references(() => collections.id, { onDelete: 'cascade' }),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
	},
	(table) => [
		uniqueIndex('linked_collections_assistant_id_collection_id_idx').on(table.assistantId, table.collectionId),
		index('linked_collections_collection_id_idx').on(table.collectionId),
	]
);

export const linkedActions = pgTable(
	'linked_actions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
		actionId: uuid('action_id')
			.notNull()
			.references(() => actions.id, { onDelete: 'cascade' }),
		assistantId: uuid('assistant_id')
			.notNull()
			.references(() => assistants.id, { onDelete: 'cascade' }),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		// Agregar el campo actionType para desnormalizar y permitir el índice único
		actionType: varchar('action_type', { length: 90 }).notNull(),
	},
	(table) => [
		uniqueIndex('linked_actions_assistant_id_action_id_idx').on(table.assistantId, table.actionId),
		uniqueIndex('linked_actions_assistant_id_action_type_idx').on(table.assistantId, table.actionType, table.organizationId),
	]
);

// ========= RELATIONS =========

export const assistantsRelations = relations(assistants, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [assistants.organizationId],
		references: [organizations.id],
	}),
	creator: one(users, {
		fields: [assistants.createdBy],
		references: [users.id],
		relationName: 'createdBy',
	}),
	linkedActions: many(linkedActions),
	linkedCollections: many(linkedCollections),
	actionResults: many(actionResults),
	// Relación uno-a-uno con assistant_configuration
	configuration: one(assistantConfiguration, {
		fields: [assistants.id],
		references: [assistantConfiguration.assistantId],
	}),
}));

export const assistantConfigurationRelations = relations(assistantConfiguration, ({ one }) => ({
	assistant: one(assistants, {
		fields: [assistantConfiguration.assistantId],
		references: [assistants.id],
	}),
	// Relación uno-a-uno con assistant_personalities
	personalities: one(assistantPersonalities, {
		fields: [assistantConfiguration.id],
		references: [assistantPersonalities.assistantConfigurationId],
	}),
}));

export const assistantPersonalitiesRelations = relations(assistantPersonalities, ({ one }) => ({
	configuration: one(assistantConfiguration, {
		fields: [assistantPersonalities.assistantConfigurationId],
		references: [assistantConfiguration.id],
	}),
	organization: one(organizations, {
		fields: [assistantPersonalities.organizationId],
		references: [organizations.id],
	}),
}));

export const linkedActionsRelations = relations(linkedActions, ({ one }) => ({
	organization: one(organizations, {
		fields: [linkedActions.organizationId],
		references: [organizations.id],
	}),
	creator: one(users, {
		fields: [linkedActions.createdBy],
		references: [users.id],
		relationName: 'createdBy',
	}),
	action: one(actions, {
		fields: [linkedActions.actionId],
		references: [actions.id],
	}),
	assistant: one(assistants, {
		fields: [linkedActions.assistantId],
		references: [assistants.id],
	}),
}));

export const linkedCollectionsRelations = relations(linkedCollections, ({ one }) => ({
	organization: one(organizations, {
		fields: [linkedCollections.organizationId],
		references: [organizations.id],
	}),
	creator: one(users, {
		fields: [linkedCollections.createdBy],
		references: [users.id],
		relationName: 'createdBy',
	}),
	assistant: one(assistants, {
		fields: [linkedCollections.assistantId],
		references: [assistants.id],
	}),
	collection: one(collections, {
		fields: [linkedCollections.collectionId],
		references: [collections.id],
	}),
}));
