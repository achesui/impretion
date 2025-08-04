import { Context } from 'hono';
import type { JWK } from 'jose';

export function JWKS(c: Context<{ Bindings: Env }>) {
	try {
		// 1. Carga la clave pública desde tus variables de entorno/secretos.
		//    Esta clave debe estar en formato JWK (JSON Web Key) y guardada como un string JSON.
		const publicKeyJwkString = c.env.JWK_PUBLIC_KEY;
		if (!publicKeyJwkString) {
			console.error('Error: La variable de entorno PUBLIC_KEY no está definida.');
			return c.json({ error: 'Internal server configuration error' }, 500);
		}

		const publicKeyJwk: JWK = JSON.parse(publicKeyJwkString);

		// 2. Construye el objeto JWKS.
		//    Es un objeto con una propiedad 'keys' que es un array que contiene tu(s) clave(s) pública(s).
		const jwks = {
			keys: [publicKeyJwk],
		};

		// 3. Establece las cabeceras de caché adecuadas.
		// Las claves públicas no cambian a menudo. Cacheadas durante un tiempo razonable
		// reduce el número de veces que Neon tiene que pedirlas.
		// 1 hora (3600 segundos) es un buen punto de partida.
		c.header('Cache-Control', 'public, max-age=120, must-revalidate');
		c.header('Content-Type', 'application/json');

		// 4. Devuelve el set de claves en formato JSON.
		return c.json(jwks);
	} catch (error) {
		console.error('Error al generar el JWKS endpoint:', error);
		return c.json({ error: 'Failed to process public key' }, 500);
	}
}
