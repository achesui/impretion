// src/lib/jwt.ts

import { SignJWT, importJWK, type JWTPayload } from "jose";
import type { JWK } from "jose";

/**
 * Define la estructura de nuestro payload personalizado extendiendo el JWTPayload de 'jose'.
 * Esto asegura la compatibilidad de tipos y nos da autocompletado para claims
 * estándar y personalizados.
 */
interface NeonJWTPayload extends JWTPayload {
  organization_id: string;
}

interface CreateJWTParams {
  privateKeyJwk: JWK;
  userId: string;
  organizationId: string;
}

/**
 * Genera un JWT de corta duración para autenticar una conexión con Neon y aplicar RLS.
 * (El resto de la JSDoc se mantiene igual)
 */
export async function createNeonJWT({
  privateKeyJwk,
  userId,
  organizationId,
}: CreateJWTParams): Promise<string> {
  try {
    const privateKey = await importJWK(privateKeyJwk, privateKeyJwk.alg);

    const payload: NeonJWTPayload = {
      organization_id: organizationId,
    };

    const jwt = await new SignJWT(payload)
      .setProtectedHeader({
        alg: privateKeyJwk.alg || "RS256",
        kid: privateKeyJwk.kid,
      })
      .setSubject(userId)
      .setIssuer("https://generator.impretion.com")
      .setAudience("https://api.neon.tech")
      .setExpirationTime("300s")
      .setIssuedAt()
      .sign(privateKey);

    return jwt;
  } catch (error) {
    console.error("❌ Error al crear el JWT:", error);
    throw new Error(
      "Failed to generate authentication token for database access."
    );
  }
}
