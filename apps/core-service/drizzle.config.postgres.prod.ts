import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.production' });

export default defineConfig({
	schema: './postgres-database/controller/schema/*',
	out: './postgres-database/controller/migrations',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL_PRODUCTION as string,
	},
});
