import { and, eq, sql } from 'drizzle-orm';
import { ActionHandlers, UpsertActionResponse } from './actions.d.types';
import { DrizzleDb } from '../../controller/db.schema';
import { actionConfiguration, actionResults, actions, actionStructure } from '../../controller/schema/actions';
import { upsertActionSchema } from '../../controller/validations';
import { JsonActionConfiguration } from '../../controller/json-schemas-validations';
import { isEqual } from 'lodash';
import { JsonFilter } from '../../../types';
import { createJsonbCondition } from '../../lib/jsonb-filter';

export const actionHandlers: ActionHandlers = {
	getActions: async (env, db, data, userData) => {
		try {
			const { actionId, withConfiguration, withStructure, type } = data;
			const { organizationId } = userData;

			// La forma correcta y eficiente de obtener datos con sus relaciones en Drizzle.
			const queryResponse = await db.query.actions.findMany({
				where: and(
					eq(actions.organizationId, organizationId),
					type ? eq(actions.type, type) : undefined,
					actionId ? eq(actions.id, actionId) : undefined
				),
				with: {
					structure: withStructure ? true : undefined,
					configuration: withConfiguration ? true : undefined,
				},
			});

			console.log('GENTE DE TWITAH  =?===> ', queryResponse);

			// Convertimos los datos generales de la acción
			const response = queryResponse.map((actionData) => {
				// Desestructuramos para separar la acción principal de sus relaciones.
				const { structure, configuration, ...actionFields } = actionData;

				return {
					action: actionFields,
					structure: structure, // Convertimos null a undefined si es necesario para Zod
					configuration: configuration, // Convertimos null a undefined
				};
			});

			return response;
		} catch (error) {
			console.error('Error fetching actions by type:', error);
			// Es una buena práctica relanzar el error para que el llamador lo maneje.
			throw error;
		}
	},

	createOrUpdateAction: async (env, db, data, userData): Promise<UpsertActionResponse> => {
		try {
			console.log('NOO -< ', data);
			const actionData = data;
			const { operation } = actionData;
			const { organizationId } = userData;

			// Extraer datos comunes
			const { configuration } = actionData.values.actionConfiguration;
			const { actionSchema, description, name } = actionData.values.actionStructure;

			// Validar campos requeridos
			if (!name || !actionSchema || !configuration) {
				throw new Error('Required fields are missing');
			}

			// Preparar datos para las operaciones
			const structureData = {
				name,
				description: description || null,
				actionSchema,
			};

			const configurationData = {
				configuration: configuration as JsonActionConfiguration,
			};

			if (operation === 'update') {
				const transactionResult = await db.transaction(async (tx) => {
					await Promise.all([
						tx.update(actionStructure).set(structureData).where(eq(actionStructure.actionId, actionData.id)),
						tx.update(actionConfiguration).set(configurationData).where(eq(actionConfiguration.actionId, actionData.id)),
					]);
					return 'updated';
				});

				return { operation: transactionResult };
			}

			// CREATE operation

			console.log('OPERACIONES --> ', actionData);
			if (operation === 'create') {
				const { createdBy, returns, type } = actionData.values.action;

				const transactionResult = await db.transaction(async (tx) => {
					const [newAction] = await tx
						.insert(actions)
						.values({
							createdBy,
							returns,
							type,
							organizationId,
						})
						.returning();

					await Promise.all([
						tx.insert(actionStructure).values({
							...structureData,
							actionId: newAction.id,
							organizationId,
						}),
						tx.insert(actionConfiguration).values({
							...configurationData,
							actionId: newAction.id,
							organizationId,
						}),
					]);

					console.log('creaoooooo!');
					return 'created';
				});
				return { operation: transactionResult };
			}

			throw new Error('Invalid operation type');
		} catch (error) {
			console.error('Error in createOrUpdateAction:', error);
			throw error;
		}
	},

	getActionResults: async (env, db, data, userData) => {
		try {
			const { id, filterResult } = data;
			const { organizationId } = userData;

			const result = await db.query.actionResults.findMany({
				where: and(
					eq(actionResults.actionId, id),
					eq(actionResults.organizationId, organizationId),
					filterResult ? createJsonbCondition(actionResults.result, filterResult) : undefined
				),
			});

			return result ?? undefined;
		} catch (error) {
			console.error('Error in getActionResultById:', error);
			throw error;
		}
	},

	createOrUpdateActionResult: async (env, db, data, userData) => {
		try {
			const { organizationId } = userData;
			if (data.operation === 'create') {
				const { values } = data;
				const [newActionResult] = await db
					.insert(actionResults)
					.values({ ...values, organizationId })
					.returning();

				if (!newActionResult) {
					throw new Error('Failed to create action result');
				}

				return newActionResult;
			}

			if (data.operation === 'update') {
				const { id, values } = data;
				// Accedemos a los datos anidados en `values.connection`
				const actionResultData = values;

				// Si no hay campos para actualizar, devolvemos el registro existente para evitar una query innecesaria.
				if (Object.keys(actionResultData).length === 0) {
					const [existingConnection] = await db
						.select()
						.from(actionResults)
						.where(and(eq(actionResults.id, id), eq(actionResults.organizationId, organizationId)));
					if (!existingConnection) {
						throw new Error('Connection not found or you do not have permission to access it.');
					}
					return existingConnection;
				}

				const [updatedConnection] = await db
					.update(actionResults)
					.set(actionResultData)
					.where(and(eq(actionResults.id, id), eq(actionResults.organizationId, organizationId)))
					.returning();

				if (!updatedConnection) {
					throw new Error('Connection not found or you do not have permission to update it.');
				}
				return updatedConnection;
			}

			throw new Error('Invalid operation type');
		} catch (error) {
			console.error(error);
			// Re-throw the error instead of returning undefined
			throw error;
		}
	},

	/**
	 * Consulta para la edicion de la configuración de acciones
	 * Ruta: action_configuration -> configuration (jsonb)
	 */
	editActionConfigurationQuery: async (env, db, data, userData) => {
		const { organizationId, userId } = userData;
		// 'schema' es la respuesta completa de la IA.
		// 'currentActionConfigurationSchema' es el estado actual de la BD.
		const { schema: aiResponse, currentActionConfigurationSchema, actionId } = data;

		try {
			if (!userId) {
				throw new Error('User not authenticated.');
			}
			if (!actionId || !organizationId) {
				throw new Error('Action ID and Organization ID are required to update configuration.');
			}

			const patch = aiResponse;

			// Si el parche es nulo, la IA determinó que no había cambios.
			if (!patch) {
				return 'No han habido cambios.';
			}

			// 2. Aplicar el parche usando nuestra función de utilidad.
			// Ahora `patch` es el objeto correcto: { schedule: ..., startDate: null, ... }
			const { newState, hasChanged } = applyPatch(currentActionConfigurationSchema, patch);

			console.log('NEW STATE => ', newState);
			console.log('HAS CHANGED => ', hasChanged);

			// 3. Si hubo cambios, actualizar la base de datos.
			if (hasChanged) {
				await db
					.update(actionConfiguration)
					.set({ configuration: newState })
					.where(and(eq(actionConfiguration.actionId, actionId), eq(actionConfiguration.organizationId, organizationId)));

				return 'Se han actualizado los campos.';
			} else {
				// No hubo cambios reales tras la fusión.
				return 'No han habido cambios.';
			}
		} catch (error) {
			console.error('Error in editActionConfigurationQuery:', error);
			throw error;
		}
	},
};

// Definimos un tipo genérico para nuestros objetos, para que TypeScript no se queje.
type AnyObject = { [key: string]: any };

/**
 * Aplica un parche a un objeto de estado de manera recursiva.
 * El parche utiliza `null` para indicar que un campo no debe ser modificado.
 *
 * @param currentState - El objeto de estado actual (ej: la configuración de la BD).
 * @param patch - El objeto de parche con valores o `null`s.
 * @returns Un objeto con el nuevo estado y un booleano indicando si hubo cambios.
 */
export function applyPatch(currentState: AnyObject, patch: AnyObject | null): { newState: AnyObject; hasChanged: boolean } {
	// Si el parche es nulo, no hay nada que hacer.
	if (patch === null || typeof patch !== 'object') {
		return { newState: { ...currentState }, hasChanged: false };
	}

	let hasChangedOverall = false;

	// Clonamos el estado actual para no mutar el original directamente.
	const newState = JSON.parse(JSON.stringify(currentState));

	function merge(target: AnyObject, source: AnyObject) {
		for (const key in source) {
			// Nos aseguramos de que la clave exista en el parche (no es estrictamente necesario, pero es seguro)
			if (Object.prototype.hasOwnProperty.call(source, key)) {
				const patchValue = source[key];
				const targetValue = target[key];

				// La regla de oro: si el valor del parche es nulo, lo ignoramos.
				if (patchValue === null) {
					continue;
				}

				// Si el valor del parche es un objeto (y no un array), aplicamos la fusión recursiva.
				if (typeof patchValue === 'object' && !Array.isArray(patchValue) && targetValue && typeof targetValue === 'object') {
					merge(targetValue, patchValue);
				} else {
					// Es un valor primitivo o un array. Verificamos si ha cambiado antes de asignarlo.
					// Usamos isEqual de lodash para una comparación profunda y fiable (maneja objetos, arrays, etc.).
					if (!isEqual(targetValue, patchValue)) {
						target[key] = patchValue;
						hasChangedOverall = true;
					}
				}
			}
		}
	}

	merge(newState, patch);

	return { newState, hasChanged: hasChangedOverall };
}
