import { UserData } from '..';
import { DrizzleDb } from '../../controller/db.schema';
import {
	CreateOrDeleteCollectionContentSchema,
	SelectCollectionSchema,
	SelectCollectionContentSchema,
	UpsertCollectionSchema,
} from '../../controller/validations';
import { CacheManager } from '../../../cache/cache-manager';

// ==== RESPUESTAS ====

export type GetCollectionsResponse = SelectCollectionSchema;

export type GetCollectionContentsResponse = SelectCollectionContentSchema[];

type UpsertCollectionResponse = SelectCollectionSchema;

type CreateOrDeleteCollectionContentSchemaResponse = SelectCollectionContentSchema;

// ==== PARAMETROS ====

type GetCollectionsParams = {
	collectionId?: string;
};

type GetCollectionContentsParams = {
	collectionId: string;
};

type CreateOrDeleteCollectionContentParams = CreateOrDeleteCollectionContentSchema;

type UpsertCollectionParams = UpsertCollectionSchema;

// ==== HANDLER ====

export type KnowledgeBaseHandlers = {
	getCollections: (env: Env, db: DrizzleDb, data: GetCollectionsParams, userData: UserData) => Promise<GetCollectionsResponse[]>;
	getCollectionContents: (
		env: Env,
		db: DrizzleDb,
		data: GetCollectionContentsParams,
		userData: UserData
	) => Promise<GetCollectionContentsResponse>;
	createOrUpdateCollection: (
		env: Env,
		db: DrizzleDb,
		data: UpsertCollectionParams,
		userData: UserData,
		cache: CacheManager
	) => Promise<UpsertCollectionResponse>;
	createOrDeleteCollectionContent: (
		env: Env,
		db: DrizzleDb,
		data: CreateOrDeleteCollectionContentParams,
		userData: UserData
	) => Promise<CreateOrDeleteCollectionContentSchemaResponse>;
};

export type CollectionQueryProps =
	| { method: 'getCollections'; data: GetCollectionsParams }
	| { method: 'createOrUpdateCollection'; data: UpsertCollectionParams }
	| { method: 'createOrDeleteCollectionContent'; data: CreateOrDeleteCollectionContentParams }
	| { method: 'getCollectionContents'; data: GetCollectionContentsParams };
