import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { fullSchema } from './db.schema';

/**
 * Crea y configura un cliente de Drizzle para interactuar con la base de datos PostgreSQL a través de Hyperdrive.
 * @param env El objeto de entorno del worker, que contiene la cadena de conexión de Hyperdrive.
 * @returns Un objeto que contiene la instancia del cliente de Drizzle (`db`) y una función para cerrar la conexión (`end`).
 */
export function drizzleClient(env: Env) {
	// Establece la conexión con la base de datos utilizando la cadena de conexión de Hyperdrive.
	const sql = postgres(env.HYPERDRIVE.connectionString, {
		max: 5, // Número máximo de conexiones en el pool.
		fetch_types: false, // Desactiva la obtención automática de tipos para mejorar el rendimiento.
	});

	// Inicializa Drizzle con el cliente de postgres, el esquema completo y la configuración.
	const db = drizzle({ client: sql, schema: fullSchema, logger: false, casing: 'camelCase' });

	// Devuelve el cliente de Drizzle y la función para terminar la conexión.
	return { db, end: () => sql.end() };
}
