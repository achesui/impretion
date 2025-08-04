import { sql } from 'drizzle-orm';
import type { AnyColumn } from 'drizzle-orm';
import { JsonFilter } from '../../types';

/**
 * Crea una condición SQL para filtrar campos JSONB
 * @param {AnyColumn} jsonbField - El campo JSONB de la tabla (ej: actionResults.result, connections.metadata)
 * @param {JsonFilter} filter - El filtro a aplicar
 * @returns {SQL} Condición SQL para usar en WHERE
 */
export function createJsonbCondition(jsonbField: AnyColumn, filter: JsonFilter) {
	switch (filter.operator) {
		case '@>':
			// Para contener un objeto específico
			return sql`${jsonbField} @> ${JSON.stringify(filter.value)}`;

		case 'IN':
			// Para valores que estén en un array
			return sql`(${jsonbField} ->> ${filter.path}) = ANY (${filter.value})`;

		default:
			// Operadores estándar: =, >=, <=, LIKE, ILIKE, !=, etc.
			return sql`(${jsonbField} ->> ${filter.path}) ${sql.raw(filter.operator)} ${filter.value}`;
	}
}
