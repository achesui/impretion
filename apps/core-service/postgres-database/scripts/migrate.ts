// migrate.ts (versión mejorada)
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { config } from 'dotenv';
import postgres from 'postgres';

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

console.log('STRING D ECONEXIO N=> ', connectionString);
if (!connectionString) {
	throw new Error(`DATABASE_URL_${environment.toUpperCase()} no está definida en ${envFile}`);
}

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

const main = async () => {
	try {
		const envName = environment === 'dev' ? 'DESARROLLO' : 'PRODUCCIÓN';
		console.log(`🚀 Iniciando migración a base de datos de ${envName}...`);

		await migrate(db, {
			migrationsFolder: 'postgres-database/controller/migrations',
		});

		console.log(`✅ Migración de ${envName.toLowerCase()} completada con éxito!`);
		await sql.end();
	} catch (error) {
		console.error(`❌ Error durante la migración de ${environment}: `, error);
		process.exit(1);
	}
};

main();
