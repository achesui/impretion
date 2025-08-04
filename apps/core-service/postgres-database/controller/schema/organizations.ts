import { bigint, decimal, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { assistants, linkedActions, linkedCollections } from './assistants';
import { relations } from 'drizzle-orm';
import { actions } from './actions';
import { JsonConnectionsMetadata } from '../json-schemas-validations';

export const organizationStatusEnum = pgEnum('organization_status', ['active', 'inactive', 'suspended']);
export const connectionTypeEnum = pgEnum('connection_type', ['direct', 'organizational']);
export const transactionTypeEnum = pgEnum('transaction_type', [
	'recharge', // cuando el usuario recarga saldo
	'usage_fee', // cuando se descuenta por uso del servicio
	'membership_fee', // cobro mensual por membresía
	'refund', // devolución al saldo
	'manual_adjustment', // cambio manual de saldo por admin
	'promotion_credit', // saldo agregado por una promo
]);

export const organizations = pgTable('organizations', {
	id: text('id').primaryKey(),
	displayName: varchar('display_name', { length: 255 }).notNull(),
	name: varchar('name', { length: 50 }).notNull(),
	status: organizationStatusEnum('status').notNull().default('active'),
	subscriptionTier: varchar('subscription_tier', { length: 40 }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	createdBy: uuid('created_by'),
});

export const collections = pgTable('collections', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name', { length: 100 }).notNull(),
	description: varchar('description', { length: 250 }).notNull(),
	totalSize: bigint('total_size', { mode: 'number' }).notNull(),
	fileCount: integer('file_count').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
	organizationId: text('organization_id')
		.notNull()
		.references(() => organizations.id, { onDelete: 'cascade' }),
});

export const collectionContent = pgTable(
	'collection_content',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		name: varchar('name', { length: 100 }).notNull(),
		key: text('key').notNull().unique(),
		size: bigint('size', { mode: 'number' }).notNull(),
		mimeType: varchar('mime_type', { length: 100 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
		createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
		collectionId: uuid('collection_id')
			.notNull()
			.references(() => collections.id, { onDelete: 'cascade' }),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
	},
	(table) => [uniqueIndex('collection_content_key_idx').on(table.key)],
);

export const connections = pgTable(
	'connections',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		type: connectionTypeEnum('type').notNull(),
		provider: varchar('provider', { length: 40 }).notNull(),
		connectedWith: varchar('connected_with', { length: 80 }).unique().notNull(),
		metadata: jsonb('metadata').$type<JsonConnectionsMetadata>(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
	},
	(table) => [
		index('connections_user_id_provider_idx').on(table.createdBy, table.provider),
		index('connections_organization_id_type_idx').on(table.organizationId, table.type),
	],
);

export const connectionSubscriptions = pgTable(
	'connection_subscriptions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		connectionId: uuid('connection_id')
			.notNull()
			.references(() => connections.id, { onDelete: 'cascade' }),
		assistantId: uuid('assistant_id').references(() => assistants.id, { onDelete: 'cascade' }),
		actionId: uuid('action_id').references(() => actions.id),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id),
	},
	(table) => [
		index('cs_connection_idx').on(table.connectionId),
		index('cs_assistant_idx').on(table.assistantId),
		index('cs_action_idx').on(table.actionId),
		uniqueIndex('unique_action_per_connection').on(table.connectionId, table.actionId),
		uniqueIndex('unique_assistant_per_connection').on(table.connectionId, table.assistantId),
	],
);

export const users = pgTable(
	'users',
	{
		id: text('id').primaryKey(),
		email: varchar('email', { length: 150 }).notNull(),
		name: varchar('name', { length: 100 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
	},
	(table) => [uniqueIndex('users_email_idx').on(table.email)],
);

export const integrations = pgTable(
	'integrations',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		service: varchar('service', { length: 32 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		refreshToken: text('refresh_token').notNull(),
		accessToken: text('access_token').notNull(),
		connectedEmail: varchar('connected_email', { length: 150 }).notNull(),
		metadata: jsonb('metadata').$type<{}>(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
	},
	(table) => [
		uniqueIndex('integrations_user_id_service_idx').on(table.userId, table.service),
		index('integrations_expires_at_idx').on(table.expiresAt),
	],
);

export const balances = pgTable(
	'balances',
	{
		id: uuid('id').defaultRandom().primaryKey(),

		// Balance financiero que importa. La verdad absoluta del patrimonio del usuario.
		// Almacenado en centavos de dólar.
		balanceInUsdCents: bigint('balance_in_usd_cents', { mode: 'number' }).notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
		organizationId: text('organization_id')
			.notNull()
			.unique()
			.references(() => organizations.id, { onDelete: 'cascade' }),
	},
	(table) => [uniqueIndex('balances_organization_id_idx').on(table.organizationId)],
);

export const balanceTransactions = pgTable(
	'balance_transactions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		type: transactionTypeEnum('type').notNull(),

		// --- Columnas Financieras (USD Cents) ---
		// El valor NETO que afecta el balance del usuario. Positivo para créditos, negativo para débitos.
		// ESTA ES LA FUENTE DE LA VERDAD PARA CUALQUIER CAMBIO DE BALANCE.
		amountInUsdCents: bigint('amount_in_usd_cents', { mode: 'number' }).notNull(),

		// Para 'RECHARGE' y 'PROMO_CREDIT', este es el saldo consumible de esta capa.
		// Para débitos, es siempre 0.
		remainingInUsdCents: bigint('remaining_in_usd_cents', { mode: 'number' }).notNull(),

		// La comisión cobrada por el procesador de pagos (ej. Mercado Pago), solo para 'RECHARGE'.
		feeInUsdCents: bigint('fee_in_usd_cents', { mode: 'number' }).notNull(),

		// --- Columnas de Auditoría y Visualización (No afectan la lógica de débito) ---
		// Moneda en la que se realizó el pago original de una recarga.
		originalPaymentCurrency: varchar('original_payment_currency', { length: 3 }), // ej: 'COP', 'PEN'

		// Monto que el usuario pagó en su moneda local (en su menor unidad).
		originalPaymentAmount: bigint('original_payment_amount', { mode: 'number' }),

		// Tasa de impuesto original por uso de servicio (MercadoPago etc..)
		originalFeeAmount: bigint('original_fee_amount', { mode: 'number' }),

		// Tasa de cambio (Local -> USD) usada en el momento de la recarga.
		fxRateUsed: decimal('fx_rate_used', { precision: 20, scale: 10 }),

		description: text('description'), // ej: "Recarga con tarjeta ****4242" o "Código Promocional 'BIENVENIDO2024'"
		// --- Metadatos y Trazabilidad ---
		jobId: uuid('job_id').unique(), // Es nulo para transacciones no generadas por el sistema de billing (ej. recargas).
		batchId: text('batch_id'), // Nulo para transacciones no generadas por el orquestador.
		createdBy: text('created_by').references(() => users.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		balanceId: uuid('balance_id')
			.notNull()
			.references(() => balances.id, { onDelete: 'cascade' }),
	},
	(table) => [
		index('balance_transactions_organization_id_created_at_idx').on(table.organizationId, table.createdAt),
		index('balance_transactions_org_type_created_idx').on(table.organizationId, table.type, table.createdAt),
	],
);

// ========= RELATIONS =========

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
	users: many(users),
	collections: many(collections),
	actions: many(actions),
	connections: many(connections),
	assistants: many(assistants),
	integrations: many(integrations),
	collectionContent: many(collectionContent),
	balance: one(balances, {
		fields: [organizations.id],
		references: [balances.organizationId],
	}),
	balanceTransactions: many(balanceTransactions),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [users.organizationId],
		references: [organizations.id],
	}),
	connections: many(connections),
	integrations: many(integrations),
	createdCollections: many(collections, { relationName: 'createdBy' }),
	createdCollectionContent: many(collectionContent, { relationName: 'createdBy' }),
	createdActions: many(actions, { relationName: 'createdBy' }),
	createdAssistants: many(assistants, { relationName: 'createdBy' }),
	createdLinkedActions: many(linkedActions, { relationName: 'createdBy' }),
	createdLinkedCollections: many(linkedCollections, { relationName: 'createdBy' }),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [collections.organizationId],
		references: [organizations.id],
	}),
	creator: one(users, {
		fields: [collections.createdBy],
		references: [users.id],
		relationName: 'createdBy',
	}),
	content: many(collectionContent),
	linkedCollections: many(linkedCollections),
}));

export const collectionContentRelations = relations(collectionContent, ({ one }) => ({
	organization: one(organizations, {
		fields: [collectionContent.organizationId],
		references: [organizations.id],
	}),
	collection: one(collections, {
		fields: [collectionContent.collectionId],
		references: [collections.id],
	}),
	creator: one(users, {
		fields: [collectionContent.createdBy],
		references: [users.id],
		relationName: 'createdBy',
	}),
}));

export const connectionsRelations = relations(connections, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [connections.organizationId],
		references: [organizations.id],
	}),
	createdBy: one(users, {
		fields: [connections.createdBy],
		references: [users.id],
	}),
	subscriptions: many(connectionSubscriptions),
}));

export const connectionSubscriptionsRelations = relations(connectionSubscriptions, ({ one }) => ({
	connection: one(connections, {
		fields: [connectionSubscriptions.connectionId],
		references: [connections.id],
	}),
	assistant: one(assistants, {
		fields: [connectionSubscriptions.assistantId],
		references: [assistants.id],
	}),
	action: one(actions, {
		fields: [connectionSubscriptions.actionId],
		references: [actions.id],
	}),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
	organization: one(organizations, {
		fields: [integrations.organizationId],
		references: [organizations.id],
	}),
	user: one(users, {
		fields: [integrations.userId],
		references: [users.id],
	}),
}));

export const balancesRelations = relations(balances, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [balances.organizationId],
		references: [organizations.id],
	}),
	transactions: many(balanceTransactions),
}));

export const balanceTransactionsRelations = relations(balanceTransactions, ({ one }) => ({
	organization: one(organizations, {
		fields: [balanceTransactions.organizationId],
		references: [organizations.id],
	}),
	balance: one(balances, {
		fields: [balanceTransactions.balanceId],
		references: [balances.id],
	}),
}));
