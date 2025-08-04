
import * as organizationSchema from './schema/organizations';
import * as assistantSchema from './schema/assistants';
import * as actionSchema from './schema/actions';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// fullSchema combina todos los esquemas de las tablas de la base de datos
// en un solo objeto para que Drizzle pueda utilizarlos.
export const fullSchema = {
	...organizationSchema,
	...assistantSchema,
	...actionSchema,
};

// DrizzleDb es el tipo que representa la instancia de la base de datos con el esquema completo.
export type DrizzleDb = PostgresJsDatabase<typeof fullSchema>;
