// --- src/db/seed.ts ---

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DrizzleDb, fullSchema as schema } from '../controller/db.schema';
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { config } from 'dotenv';

config({ path: '.env' });

// Obtener el entorno del primer argumento
const environment = process.argv[2];

if (!environment || !['dev', 'prod'].includes(environment)) {
	console.error('❌ Debes especificar el entorno: dev o prod');
	console.log('Uso: tsx migrate.ts dev|prod');
	process.exit(1);
}

// Cargar el archivo .env correspondiente
const envFile = environment === 'dev' ? '.env.local' : '.env.production';
config({ path: envFile });

const connectionString = environment === 'dev' ? process.env.DATABASE_URL_DEVELOPMENT : process.env.DATABASE_URL_PRODUCTION;

if (!connectionString) {
	throw new Error(`DATABASE_URL_${environment.toUpperCase()} no está definida en ${envFile}`);
}

console.log('String de conexión => ', connectionString);

// Cliente postgres usando solo el connection string
const client = postgres(connectionString, {
	max: 10, // Pool de conexiones
	idle_timeout: 20, // Tiempo antes de cerrar conexiones inactivas
	connect_timeout: 10, // Timeout de conexión
});

// Inicializar Drizzle con el cliente
const db = drizzle(client, { schema });

// Constantes para la simulación financiera
const FX_RATE_COP_TO_USD = 0.00025; // Asumimos 1 USD = 4,000 COP
const PROMO_CREDIT_USD_CENTS = 500; // $5.00
const RECHARGE_COP_CENTS = 8000000; // 80,000.00 COP

console.log('🌱 Iniciando siembra de la base de datos...');

async function main() {
	try {
		// --- BORRADO DE DATOS ANTERIORES (en orden inverso de creación de dependencias) ---
		console.log('🗑️  Limpiando datos existentes...');
		await db.delete(schema.linkedCollections);
		await db.delete(schema.collections);
		await db.delete(schema.linkedActions);
		await db.delete(schema.actionStructure);
		await db.delete(schema.actionConfiguration);
		await db.delete(schema.assistantConfiguration);
		await db.delete(schema.assistantPersonalities);
		await db.delete(schema.balanceTransactions);
		await db.delete(schema.balances);
		await db.delete(schema.assistants);
		await db.delete(schema.actions);
		await db.delete(schema.users);
		await db.delete(schema.organizations);
		console.log('✅ Datos existentes eliminados.');

		// --- ================================== ---
		// --- FASE 1: CREACIÓN DE ENTIDADES BASE ---
		// --- ================================== ---

		// 1. ORGANIZACIONES
		console.log('🏢 Creando organizaciones...');
		const organizationIds = [
			'org_6VkgJZPon0UTsNfa',
			'org_A1bC2dE3fG4hI5jK',
			'org_L6mN7oP8qR9sT0uV',
			'org_W1xY2zZ3aB4cD5eF',
			'org_G6hI7jK8lM9nO0pQ',
			'org_R1sT2uV3wX4yZ5zA',
			'org_B6cD7eF8gH9iJ0kL',
			'org_M1nO2pQ3rS4tU5vW',
			'org_X6yZ7zZ8aB9cD0eF',
			'org_I1jK2lM3nO4pQ5rS',
		];
		const organizationsToInsert: (typeof schema.organizations.$inferInsert)[] = organizationIds.map((id, index) => ({
			id,
			name: `org-${index + 1}`,
			displayName: `Organization ${index + 1}`,
			status: 'active',
		}));
		await db.insert(schema.organizations).values(organizationsToInsert);
		console.log(`✅ ${organizationsToInsert.length} organizaciones creadas.`);

		// 2. USUARIOS
		console.log('👤 Creando usuarios...');
		const usersToInsert: (typeof schema.users.$inferInsert)[] = [];
		const userIds: string[] = [];

		// Agregar el usuario específico de Google OAuth para la primera organización
		const googleOAuthUserId = 'google-oauth2|103923806057449768456';
		userIds.push(googleOAuthUserId);
		usersToInsert.push({
			id: googleOAuthUserId,
			name: `Admin de ${organizationIds[0].slice(4, 12)}`,
			email: `admin+${organizationIds[0].slice(4, 12)}@example.com`,
			organizationId: organizationIds[0], // org_6VkgJZPon0UTsNfa
		});

		// Crear usuarios para el resto de organizaciones (manteniendo la lógica original)
		for (let i = 1; i < organizationIds.length; i++) {
			const orgId = organizationIds[i];
			const userId = `user_${randomUUID().slice(0, 12)}`;
			userIds.push(userId);
			usersToInsert.push({
				id: userId,
				name: `Admin de ${orgId.slice(4, 12)}`,
				email: `admin+${orgId.slice(4, 12)}@example.com`,
				organizationId: orgId,
			});
		}

		await db.insert(schema.users).values(usersToInsert);
		console.log(`✅ ${usersToInsert.length} usuarios creados (incluyendo usuario Google OAuth).`);

		// 3. BALANCES
		console.log('💰 Creando balances iniciales...');
		const balancesToInsert: (typeof schema.balances.$inferInsert)[] = organizationIds.map((orgId) => ({
			organizationId: orgId,
			balanceInUsdCents: 0,
		}));
		const insertedBalances = await db.insert(schema.balances).values(balancesToInsert).returning({
			id: schema.balances.id,
			organizationId: schema.balances.organizationId,
		});
		console.log(`✅ ${insertedBalances.length} balances creados.`);
		const balanceIdMap = new Map(insertedBalances.map((b) => [b.organizationId, b.id]));

		// --- ======================================= ---
		// --- FASE 2: SIMULACIÓN FINANCIERA PRECISA   ---
		// --- ======================================= ---
		console.log('💸 Simulando transacciones financieras...');
		const transactionsToInsert: (typeof schema.balanceTransactions.$inferInsert)[] = [];
		let totalBalanceUpdates: { orgId: string; amount: number }[] = [];

		for (const orgId of organizationIds) {
			const balanceId = balanceIdMap.get(orgId)!;

			// A. Crédito Promocional ($5.00)
			transactionsToInsert.push({
				type: 'promotion_credit',
				amountInUsdCents: PROMO_CREDIT_USD_CENTS,
				remainingInUsdCents: PROMO_CREDIT_USD_CENTS,
				feeInUsdCents: 0,
				originalPaymentCurrency: null,
				originalPaymentAmount: null,
				fxRateUsed: null,
				description: 'Crédito de bienvenida',
				organizationId: orgId,
				balanceId: balanceId,
			});
			totalBalanceUpdates.push({ orgId, amount: PROMO_CREDIT_USD_CENTS });

			// B. Recarga con Tarjeta (80,000 COP)
			const grossAmountInUsdCents = Math.round(Number(RECHARGE_COP_CENTS) * FX_RATE_COP_TO_USD);
			const feeInUsdCents = Math.round(Number(grossAmountInUsdCents) * 0.035) + 25; // Simula 3.5% + $0.25 fee
			const netAmountInUsdCents = grossAmountInUsdCents - feeInUsdCents;

			transactionsToInsert.push({
				type: 'recharge',
				amountInUsdCents: netAmountInUsdCents,
				remainingInUsdCents: netAmountInUsdCents,
				feeInUsdCents: feeInUsdCents,
				originalPaymentCurrency: 'COP',
				originalPaymentAmount: RECHARGE_COP_CENTS,
				fxRateUsed: FX_RATE_COP_TO_USD.toString(),
				description: 'Recarga con Tarjeta Visa **** 4242',
				organizationId: orgId,
				balanceId: balanceId,
			});
			totalBalanceUpdates.push({ orgId, amount: netAmountInUsdCents });
		}

		await db.insert(schema.balanceTransactions).values(transactionsToInsert);
		console.log(`✅ ${transactionsToInsert.length} transacciones de crédito creadas.`);

		// C. Actualizar los balances totales
		for (const update of totalBalanceUpdates) {
			await db
				.update(schema.balances)
				.set({ balanceInUsdCents: sql`${schema.balances.balanceInUsdCents} + ${update.amount}` })
				.where(eq(schema.balances.organizationId, update.orgId));
		}
		console.log(`✅ Balances actualizados con créditos iniciales.`);

		// D. Simular un débito por uso para la primera organización
		console.log('⚙️  Simulando débito por uso para la primera organización...');
		const firstOrgId = organizationIds[0];
		const firstOrgBalanceId = balanceIdMap.get(firstOrgId)!;
		const usageDebitInUsdCents = -150; // -$1.50

		await db
			.update(schema.balanceTransactions)
			.set({ remainingInUsdCents: sql`${schema.balanceTransactions.remainingInUsdCents} + ${usageDebitInUsdCents}` })
			.where(and(eq(schema.balanceTransactions.organizationId, firstOrgId), eq(schema.balanceTransactions.type, 'promotion_credit')));

		await db.insert(schema.balanceTransactions).values({
			type: 'usage_fee',
			amountInUsdCents: usageDebitInUsdCents,
			remainingInUsdCents: 0,
			feeInUsdCents: 0,
			originalPaymentCurrency: null,
			originalPaymentAmount: null,
			fxRateUsed: null,
			jobId: randomUUID(),
			batchId: randomUUID(),
			description: 'Débito por uso de API (simulado)',
			organizationId: firstOrgId,
			balanceId: firstOrgBalanceId,
		});

		await db
			.update(schema.balances)
			.set({ balanceInUsdCents: sql`${schema.balances.balanceInUsdCents} + ${usageDebitInUsdCents}` })
			.where(eq(schema.balances.organizationId, firstOrgId));
		console.log('✅ Débito simulado correctamente.');

		// --- ======================================= ---
		// --- FASE 3: CREACIÓN DE ENTIDADES DE APOYO ---
		// --- ======================================= ---
		console.log('🤖 Creando asistentes, acciones y colecciones...');
		const assistantIds: string[] = [];

		for (let i = 0; i < organizationIds.length; i++) {
			const orgId = organizationIds[i];
			const creatorId = userIds[i];

			// Crear asistentes
			let assistantId: string;
			if (i === 0) {
				// Usar el ID específico para la primera organización (org_6VkgJZPon0UTsNfa)
				assistantId = 'abccf806-4c84-43de-af3f-ad373e67bf12';
			} else {
				assistantId = randomUUID();
			}
			assistantIds.push(assistantId);

			await db.insert(schema.assistants).values({
				id: assistantId,
				name: `Asistente de Soporte ${i + 1}`,
				status: 'active',
				prompt: '',
				organizationId: orgId,
				createdBy: creatorId,
			});

			// Crear acciones
			await db.insert(schema.actions).values({
				id: randomUUID(),
				type: 'API_CALL',
				returns: true,
				organizationId: orgId,
				createdBy: creatorId,
			});
		}

		// --- ======================================= ---
		// --- FASE 4: CONFIGURACIÓN DE ASISTENTES ---
		// --- ======================================= ---
		console.log('⚙️  Creando configuraciones de asistentes...');

		for (let i = 0; i < assistantIds.length; i++) {
			const assistantId = assistantIds[i];
			const orgId = organizationIds[i];

			// Crear assistant_configuration primero
			const configurationId = randomUUID();
			await db.insert(schema.assistantConfiguration).values({
				id: configurationId,
				assistantId: assistantId,
				organizationId: orgId,
			});

			// Crear assistant_personalities después, referenciando la configuración
			await db.insert(schema.assistantPersonalities).values({
				id: randomUUID(),
				friendliness: 3,
				seriousness: 3,
				empathy: 3,
				confidence: 3,
				professionalism: 5,
				patience: 3,
				curiosity: 4,
				emojis: 2,
				verbosity: 'normal',
				complianceLevel: 'standard',
				assistantConfigurationId: configurationId,
				organizationId: orgId,
			});
		}

		console.log('✅ Entidades de apoyo creadas.');
		console.log(`✅ ${assistantIds.length} configuraciones de asistentes creadas.`);

		console.log('✨ Siembra completada exitosamente.');
	} catch (error) {
		console.error('❌ Error durante la siembra de la base de datos:', error);
		process.exit(1);
	} finally {
		console.log('🔚 Proceso de siembra finalizado.');
		// Cerrar la conexión
		await client.end();
	}
}

main();
