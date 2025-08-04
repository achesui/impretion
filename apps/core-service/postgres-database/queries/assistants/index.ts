import { and, eq } from 'drizzle-orm';
import { AssistantHandlers } from './assistants.d.types';
import { assistantPersonalities, assistants, linkedActions, linkedCollections } from '../../controller/schema/assistants';

export const assistantHandlers: AssistantHandlers = {
	getAssistants: async (env, db, data, userData) => {
		try {
			const { id, withLinkedActions, withLinkedCollections, withPersonalities } = data;
			const { organizationId } = userData;

			const queryResponse = await db.query.assistants.findMany({
				where: and(id ? eq(assistants.id, id) : undefined, eq(assistants.organizationId, organizationId)),
				with: {
					linkedCollections: withLinkedCollections ? true : undefined,
					linkedActions: withLinkedActions
						? {
								with: {
									action: {
										with: {
											structure: true,
											configuration: true,
										},
									},
								},
						  }
						: undefined,
					configuration: {
						with: {
							personalities: withPersonalities ? true : undefined,
						},
					},
				},
			});

			// Transformar TODA la respuesta para que coincida con SelectAssistantSchema
			const transformedResponse = queryResponse.map((assistant) => ({
				...assistant,
				// Asegurar que linkedActions siempre tenga la estructura correcta
				linkedActions:
					withLinkedActions && assistant.linkedActions
						? assistant.linkedActions.map((linkedAction: any) => ({
								linkedActionId: linkedAction.id,
								action: linkedAction.action,
						  }))
						: undefined,
				// Asegurar que linkedCollections tenga la estructura correcta
				linkedCollections: withLinkedCollections && assistant.linkedCollections ? assistant.linkedCollections : undefined,
			}));

			return transformedResponse;
		} catch (error) {
			console.error('Error fetching assistant(s):', error);
			throw error;
		}
	},

	updateAssistantActions: async (env, db, data, userData) => {
		try {
			const { operation } = data;
			const { organizationId, userId } = userData;

			if (operation === 'create') {
				console.log('aentro..');
				const values = data.values;
				console.log('nueva linkeada accion => ', { ...values });
				const [newAssistantLinkedAction] = await db
					.insert(linkedActions)
					.values({
						...values,
						organizationId,
						createdBy: userId,
					})
					.returning({ id: linkedActions.id });

				return { id: newAssistantLinkedAction.id };
			}

			if (operation === 'delete') {
				console.log('EN LA DELETE DE MRD => ', data.id);
				const [deletedAssistantLinkedAction] = await db
					.delete(linkedActions)
					.where(eq(linkedActions.id, data.id))
					.returning({ id: linkedActions.id });
				return { id: deletedAssistantLinkedAction.id };
			}

			throw new Error('Unsupported operation');
		} catch (error) {
			console.error('Error linking action, ', error);
			throw error;
		}
	},

	updateAssistantPrompt: async (env, db, data, userData) => {
		try {
			const { organizationId, userId } = userData;
			const { id, assistantPrompt, linkedCollections: linkedCollectionsData } = data;

			console.log('ROOOOOOOOOOOT -> ', linkedCollectionsData);
			// 1. Verificar existencia y pertenencia
			const [existingAssistant] = await db
				.select({ id: assistants.id })
				.from(assistants)
				.where(and(eq(assistants.id, id), eq(assistants.organizationId, organizationId)))
				.limit(1);

			if (!existingAssistant) {
				throw new Error('Assistant not found or access denied');
			}

			// 2. Ejecutar actualizaciones en transacción
			await db.transaction(async (tx) => {
				// Actualizar campos generales del asistente
				if (assistantPrompt && Object.keys(assistantPrompt).length > 0) {
					await tx.update(assistants).set(assistantPrompt).where(eq(assistants.id, id));
				}

				// Actualizar linkedCollections (reemplazo total)
				if (linkedCollectionsData) {
					// Eliminar todas las linkedCollections existentes para este assistant
					await tx.delete(linkedCollections).where(eq(linkedCollections.assistantId, id));

					// Si hay colecciones para vincular
					if (linkedCollectionsData.length > 0) {
						const collectionsToInsert = linkedCollectionsData.map((collectionId) => ({
							assistantId: id,
							collectionId: collectionId, // Directamente el string ID
							organizationId,
							createdBy: userId,
						}));

						await tx.insert(linkedCollections).values(collectionsToInsert);
					}
				}
			});

			return { id: existingAssistant.id };
		} catch (error) {
			console.error('Error updating assistant:', error);
			throw error;
		}
	},

	updateAssistantConfiguration: async (env, db, data, userData) => {
		try {
			const { organizationId, userId } = userData;
			console.log('DATOS => ', data);
			const { updatePersonalities } = data;

			if (updatePersonalities.id) {
				const { personalities } = updatePersonalities;
				const updatedAssistantPersonalities = await db
					.update(assistantPersonalities)
					.set({
						...personalities,
						organizationId,
					})
					.where(eq(assistantPersonalities.id, updatePersonalities.id));
				console.log('updatedAssistantPersonalities => ', updatedAssistantPersonalities);
			}
		} catch (error) {
			throw error;
		}
	},
};
