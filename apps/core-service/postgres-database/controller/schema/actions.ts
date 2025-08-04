import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { organizations, users } from './organizations';
import { assistants, linkedActions } from './assistants';
import { relations } from 'drizzle-orm';
import { JsonActionConfiguration, JsonActionSchema } from '../json-schemas-validations';

export const actionResultStatusEnum = pgEnum('action_result_status', ['pending', 'running', 'completed', 'failed', 'cancelled']);

export const actions = pgTable(
	'actions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		type: varchar('type', { length: 90 }).notNull(),
		returns: boolean('returns').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
	},
	(table) => [index('actions_organization_id_type_idx').on(table.organizationId, table.type)]
);

export const actionStructure = pgTable(
	'action_structure',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		name: varchar('name', { length: 80 }).notNull(),
		description: varchar('description', { length: 180 }),
		actionSchema: jsonb('action_schema').$type<JsonActionSchema>().notNull(),
		actionId: uuid('action_id')
			.notNull()
			.unique()
			.references(() => actions.id, { onDelete: 'cascade' }),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
	},
	(table) => [index('action_structure_action_id_idx').on(table.actionId)]
);

export const actionConfiguration = pgTable(
	'action_configuration',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		configuration: jsonb('configuration').$type<JsonActionConfiguration>().notNull(),
		actionId: uuid('action_id')
			.notNull()
			.unique()
			.references(() => actions.id, { onDelete: 'cascade' }),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
	},
	(table) => [index('action_configuration_action_id_idx').on(table.actionId)]
);

export const actionResults = pgTable(
	'action_results',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		status: actionResultStatusEnum('status').notNull().default('pending'),
		result: jsonb('result').$type<Record<string, any>>().notNull(),
		metadata: jsonb('metadata').$type<Record<string, any>>(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		actionId: uuid('action_id')
			.notNull()
			.references(() => actions.id, { onDelete: 'cascade' }),
		assistantId: uuid('assistant_id')
			.notNull()
			.references(() => assistants.id, { onDelete: 'set null' }),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
	},
	(table) => [index('action_results_action_status_created_idx').on(table.actionId, table.status, table.createdAt)]
);

// ========= RELATIONS =========

export const actionsRelations = relations(actions, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [actions.organizationId],
		references: [organizations.id],
	}),
	creator: one(users, {
		fields: [actions.createdBy],
		references: [users.id],
		relationName: 'createdBy',
	}),
	structure: one(actionStructure, {
		fields: [actions.id],
		references: [actionStructure.actionId],
	}),
	configuration: one(actionConfiguration, {
		fields: [actions.id],
		references: [actionConfiguration.actionId],
	}),
	results: many(actionResults),
	linkedActions: many(linkedActions),
}));

export const actionStructureRelations = relations(actionStructure, ({ one }) => ({
	organization: one(organizations, {
		fields: [actionStructure.organizationId],
		references: [organizations.id],
	}),
	action: one(actions, {
		fields: [actionStructure.actionId],
		references: [actions.id],
	}),
}));

export const actionConfigurationRelations = relations(actionConfiguration, ({ one }) => ({
	organization: one(organizations, {
		fields: [actionConfiguration.organizationId],
		references: [organizations.id],
	}),
	action: one(actions, {
		fields: [actionConfiguration.actionId],
		references: [actions.id],
	}),
}));

export const actionResultsRelations = relations(actionResults, ({ one }) => ({
	organization: one(organizations, {
		fields: [actionResults.organizationId],
		references: [organizations.id],
	}),
	action: one(actions, {
		fields: [actionResults.actionId],
		references: [actions.id],
	}),
	assistant: one(assistants, {
		fields: [actionResults.assistantId],
		references: [assistants.id],
	}),
}));
