import { and, eq, sql } from 'drizzle-orm';
import { collectionContent, collections } from '../../controller/schema/organizations';
import { GetCollectionsResponse, KnowledgeBaseHandlers } from './knowledge-base.d.types';
import { cacheHandler } from '../../../cache/cache-handler.d.js';

export const knowledgeBaseHandlers: KnowledgeBaseHandlers = {
	getCollections: async (env, db, data, userData) => {
		try {
			const { collectionId } = data;
			const { organizationId } = userData;

			const queryResponse = await db
				.select()
				.from(collections)
				.where(
					collectionId
						? and(eq(collections.organizationId, organizationId), eq(collections.id, collectionId))
						: eq(collections.organizationId, organizationId)
				);

			return queryResponse;
		} catch (error) {
			throw error;
		}
	},

	getCollectionContents: async (env, db, data, userData) => {
		try {
			const { collectionId } = data;
			const collectionContents = await db
				.select()
				.from(collectionContent)
				.where(and(eq(collectionContent.collectionId, collectionId), eq(collectionContent.organizationId, userData.organizationId)));

			return collectionContents;
		} catch (error) {
			throw error;
		}
	},

	createOrUpdateCollection: async (env, db, data, userData, cache) => {
		try {
			const { organizationId, userId } = userData;

			if (data.operation === 'create') {
				const { description, name } = data.values;
				const [newCollection] = await db
					.insert(collections)
					.values({ description, name, createdBy: userId, totalSize: 0, createdAt: new Date(), fileCount: 0, organizationId })
					.returning();

				// Construcción y creación del cache.
				await createOrUpdateCollectionCache(env, organizationId, newCollection);
				return newCollection;
			}

			if (data.operation === 'update') {
				const { id, values } = data;
				const collectionData = values;

				// Si no hay campos para actualizar, devolvemos el registro existente para evitar una query innecesaria.
				if (Object.keys(collectionData).length === 0) {
					const [existingConnection] = await db
						.select()
						.from(collections)
						.where(and(eq(collections.id, id), eq(collections.organizationId, organizationId)));
					if (!existingConnection) {
						throw new Error('Connection not found or you do not have permission to access it.');
					}
					return existingConnection;
				}

				const [updatedCollection] = await db
					.update(collections)
					.set(collectionData)
					.where(and(eq(collections.id, id), eq(collections.organizationId, organizationId)))
					.returning();

				if (!updatedCollection) {
					throw new Error('Connection not found or you do not have permission to update it.');
				}

				await createOrUpdateCollectionCache(env, organizationId, updatedCollection);

				return updatedCollection;
			}

			throw new Error('Invalid operation specified.');
		} catch (error) {
			throw error;
		}
	},

	createOrDeleteCollectionContent: async (env, db, data, userData) => {
		try {
			const { organizationId } = userData;
			if (data.operation === 'create') {
				const { collectionId, key, name, size, createdBy, id, mimeType } = data.values;

				const newCollectionContent = await db.transaction(async (tx) => {
					// 1. Insertar el nuevo contenido
					const [insertedContent] = await tx
						.insert(collectionContent)
						.values({
							collectionId,
							key,
							name,
							size,
							createdAt: new Date(),
							createdBy,
							id,
							mimeType,
							organizationId,
						})
						.returning();

					await tx
						.update(collections)
						.set({
							fileCount: sql`${collections.fileCount} + 1`,
							totalSize: sql`${collections.totalSize} + ${size}`,
						})
						.where(eq(collections.id, collectionId))
						.returning();

					console.log('CONTENIDO INSERTADO ----------------> ', insertedContent);
					return insertedContent;
				});

				return newCollectionContent;
			}

			if (data.operation === 'delete') {
				const collectionContentId = data.id;

				const deletedCollectionContent = await db.transaction(async (tx) => {
					// 1. Eliminar el archivo de la colección
					const [deleted] = await tx.delete(collectionContent).where(eq(collectionContent.id, collectionContentId)).returning();

					if (!deleted) throw new Error('Contenido no encontrado');

					const { collectionId, size } = deleted;

					// 2. Actualizar la colección
					await tx
						.update(collections)
						.set({
							fileCount: sql`${collections.fileCount} - 1`,
							totalSize: sql`${collections.totalSize} - ${size}`,
						})
						.where(eq(collections.id, collectionId))
						.returning();

					// 3. Retornar el contenido eliminado
					return deleted;
				});

				return deletedCollectionContent;
			}

			throw new Error('Invalid operation specified.');
		} catch (error) {
			throw error;
		}
	},
};

/**
 * MANEJADORES DE CACHE PARA 'COLLECTIONS'
 */
const createOrUpdateCollectionCache = async (env: Env, organizationId: string, collection: GetCollectionsResponse) => {
	const { cacheKeyBuilder, cacheManager } = cacheHandler(env, organizationId);
	const key = cacheKeyBuilder.entity({ name: 'collections', identifier: collection.id }).build();
	console.log('llave -----------> ', key);
	console.log('metadatos a insers => ', collection.id);
	const cacheResult = await cacheManager.put({
		key,
		value: null,
		metadata: collection,
	});
	console.log('resultado de cache => ', cacheResult);
};
