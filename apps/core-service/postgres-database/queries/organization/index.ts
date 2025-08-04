import { neon } from '@neondatabase/serverless';
import { GetBalanceResponse, OrganizationHandlers } from './organizations.d.types';
import { authenticatedUser } from '../../lib/authenticated-user';
import {
	addMemberToOrganization,
	assignRoleToMember,
	createOrganization,
	deleteOrganization,
	getAuth0User,
	updateAuth0User,
} from '../../../auth0/methods';
import { balances, balanceTransactions, organizations, users } from '../../controller/schema/organizations';
import { assistantConfiguration, assistantPersonalities, assistants } from '../../controller/schema/assistants';
import { sagaPattern } from '../../../utils/saga';
import { eq, sql } from 'drizzle-orm';
import { cacheHandler } from '../../../cache/cache-handler.d.js';
import { SelectBalanceSchema } from '../../controller/validations';

export const organizationHandlers: OrganizationHandlers = {
	createOrganization: async (env, db, data, userData) => {
		const { userId } = userData;
		const { organizationDisplayName } = data;

		if (!userId) throw new Error('User ID is required');
		const saga = sagaPattern();

		try {
			const createdOrganizationResponse = await createOrganization({
				env,
				data: { displayName: organizationDisplayName },
				userData,
			});

			if (!createdOrganizationResponse.success) {
				throw new Error('Failed to create organization in Auth0');
			}

			const { data: createdOrganization } = createdOrganizationResponse;

			saga.dispatch(async () => {
				try {
					console.log(`Compensating: Deleting organization ${createdOrganization.id} from Auth0`);
					await deleteOrganization(env, {}, { organizationId: createdOrganization.id });
				} catch (error) {
					console.error('Failed to delete organization from Auth0:', error);
				}
			});

			const createdMemberResponse = await addMemberToOrganization({
				env,
				data: {},
				userData: { organizationId: createdOrganization.id, userId },
			});

			console.log('createdMemberResponse => ', createdMemberResponse);

			if (!createdMemberResponse.success) {
				throw new Error('Failed to add member to organization in Auth0');
			}

			const assignedUserRoleResponse = await assignRoleToMember({
				env,
				data: {},
				userData: { organizationId: createdOrganization.id, userId },
			});

			if (!assignedUserRoleResponse.success) {
				throw new Error('Failed to assign role to member in Auth0');
			}

			const auth0UserResponse = await getAuth0User<{
				app_metadata?: {
					organizations?: {
						ids?: string[];
						last_active_organization?: string;
					};
					// Aquí podrían ir otras claves de app_metadata
					[key: string]: any;
				};
				email: string;
				username?: string;
				name?: string;
			}>({
				env,
				data: { fields: 'app_metadata,username,name,email', include_fields: true },
				userData,
			});

			if (!auth0UserResponse.success) {
				throw new Error('Failed to fetch user data from Auth0');
			}

			const { data: auth0User } = auth0UserResponse;
			const existingMetadata = auth0User.app_metadata ?? {};

			// Checkpoint para revertir los datos del usuario si algo falla en la inserción de la base de datos.
			saga.dispatch(async () => {
				try {
					console.log('Compensating: Restoring original app_metadata for user', userId);
					await updateAuth0User({
						env,
						data: { app_metadata: existingMetadata },
						userData,
					});
					console.log('Original app_metadata restored.');
				} catch (compensationError) {
					console.error('Failed to compensate app_metadata update:', compensationError);
				}
			});

			const existingOrganizations = existingMetadata.organizations ?? {};
			const existingOrganizationsIds = existingOrganizations.ids ?? [];

			// Con el set prevenimos posibles datos duplicados.
			const updatedOrganizationsIds = Array.from(new Set([...existingOrganizationsIds, createdOrganization.id]));

			await updateAuth0User({
				env,
				data: {
					// Creacion del payload final para app_metadata, preservando cualquier otra propiedad en la raiz o dentro del objeto organizations
					app_metadata: {
						...existingMetadata,
						organizations: {
							...existingOrganizations,
							ids: updatedOrganizationsIds,
							last_active_organization: createdOrganization.id,
						},
					},
				},
				userData,
			});

			const transactionResult = await db.transaction(async (tx) => {
				const [newOrganization] = await tx
					.insert(organizations)
					.values({
						id: createdOrganization.id,
						displayName: createdOrganization.display_name,
						name: createdOrganization.name,
						subscriptionTier: 'free',
					})
					.returning();

				/**
				 * Este usuario es el mismo de auth0 pero en nuestra base de datos.
				 * Podemos usar el usuario de auth0 o este creado en la base de datos para campos 'createdBy'
				 */
				const [newUser] = await tx
					.insert(users)
					.values({
						email: auth0User.email,
						name: auth0User.name || auth0User.username || '',
						organizationId: newOrganization.id,
						id: userId,
						createdAt: new Date(),
					})
					.returning();

				const [newAssistant] = await tx
					.insert(assistants)
					.values({
						name: 'Asistente',
						organizationId: newOrganization.id,
						createdBy: newUser.id,
						status: 'active',
						prompt: '',
						isPublic: true,
						description: '',
					})
					.returning({ id: assistants.id });

				const [newAssistantConfiguration] = await tx
					.insert(assistantConfiguration)
					.values({
						assistantId: newAssistant.id,
						organizationId: newOrganization.id,
					})
					.returning({ id: assistantConfiguration.id });

				await tx.insert(assistantPersonalities).values({
					assistantConfigurationId: newAssistantConfiguration.id,
					organizationId: newOrganization.id,
				});

				await tx.insert(balances).values({
					balanceInUsdCents: 0,
					organizationId: newOrganization.id,
				});

				// Retorna datos útiles
				return {
					organizationId: newOrganization.id,
					assistantId: newAssistant.id,
					userId,
				};
			});

			console.log('Organization creation completed successfully');
			saga.success();
			return { organizationId: transactionResult.organizationId, userId };
		} catch (error) {
			console.error('Error in organization creation process:', error);

			// Ejecutar todas las compensaciones en orden inverso
			await saga.cancel();

			// Re-lanzar el error para que el llamador pueda manejarlo
			throw error;
		}
	},

	updateOrganizationBalance: async (env, db, data, userData) => {
		const { organizationId, userId } = userData;

		const {
			amountInUsdCents,
			originalFeeAmount,
			description,
			feeInUsdCents,
			fxRateUsed,
			originalPaymentAmount,
			originalPaymentCurrency,
			type,
		} = data;
		console.log('datos recibidos => ', data);
		const currentDate = new Date();
		try {
			const totalBalanceInUsdCents = await db.transaction(async (tx) => {
				const [balance] = await tx
					.update(balances)
					.set({
						balanceInUsdCents: sql`${balances.balanceInUsdCents} + ${amountInUsdCents}`,
						updatedAt: currentDate,
					})
					.where(eq(balances.organizationId, organizationId))
					.returning({ id: balances.id, balanceInUsdCents: balances.balanceInUsdCents });

				await tx.insert(balanceTransactions).values({
					amountInUsdCents,
					type,
					remainingInUsdCents: amountInUsdCents, // Al inicio es el mismo monto de recarga, se ira consumiendo (FIFO).
					feeInUsdCents,
					createdAt: currentDate,
					originalPaymentAmount,
					description,
					fxRateUsed,
					originalPaymentCurrency,
					organizationId,
					originalFeeAmount,
					balanceId: balance.id,
				});

				return balance.balanceInUsdCents;
			});

			// actualizacion del cache en el balance.
			const { cacheKeyBuilder, cacheManager } = cacheHandler(env, organizationId);
			const key = cacheKeyBuilder.entity({ name: 'balance' }).build();

			await cacheManager.put({
				key,
				value: { balanceInUsdCents: totalBalanceInUsdCents, updatedAt: currentDate, rate: fxRateUsed, currency: originalPaymentCurrency },
			});

			console.log('Balance updated successfully');
		} catch (error) {
			console.error('Ha ocurrido un error: ', error);
		}
	},

	getOrganizationBalance: async (env, db, data, userData) => {
		const { organizationId } = userData;
		const { currency } = data;
		const { cacheKeyBuilder, cacheManager } = cacheHandler(env, organizationId);
		const key = cacheKeyBuilder.entity({ name: 'balance' }).build();

		// Verificación del cache, si no, obtenemos de la base de datos directamente.
		const balanceCache = await cacheManager.get<GetBalanceResponse>({
			key,
		});

		console.log('------------ >', balanceCache);
		if (balanceCache) {
			return balanceCache;
		}

		const [currentOrganizationBalance] = await db.select().from(balances).where(eq(balances.organizationId, organizationId));
		const { balanceInUsdCents, updatedAt } = currentOrganizationBalance;

		// Obtenemos, según la moneda de campo del usuario en la UI, el precio actual de la moneda para transformar los dolares en moneda local.
		// Según la 'currency' calcula el precio de la moneda y se encarga de cachearlo globalmente en el sistema (KV -> SYSTEM)
		const fxRate = await env.APIS_GATEWAY.openExchange({
			currency,
		});

		if (fxRate.success) {
			const { rate } = fxRate.data;
			await cacheManager.put({
				key,
				value: { balanceInUsdCents, updatedAt, rate, currency },
			});
		}

		return { balanceInUsdCents, updatedAt, rate: fxRate.success ? fxRate.data.rate : null, currency };
	},

	/**
	 * Consulta personalizada que realiza el asistente de IMPRETION de lenguaje natural a SQL.
	 */
	customQuery: async (env, db, data, userData) => {
		const { organizationId, userId } = userData;
		const { query } = data;

		try {
			if (!userId) throw new Error();

			const neonAuth = await authenticatedUser({
				identifier: userId,
				organizationId,
				env,
			});

			const sql = neon(env.AUTHENTICATED_ROLE, {
				authToken: neonAuth,
			});

			const newQuery = await sql.query(query);
			console.log('nova query => ', newQuery);
			const queryResult = JSON.stringify(newQuery);
			console.log('respuesta de la query => ', queryResult);

			return queryResult;
		} catch (error) {
			throw error;
		}
	},
};
