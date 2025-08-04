// src/lib/pkce.ts

/**
 * Genera una cadena aleatoria segura para el code_verifier.
 * El verifier debe ser una cadena criptográficamente aleatoria con una longitud
 * entre 43 y 128 caracteres.
 */
function generateCodeVerifier(): string {
  const array = new Uint32Array(28); // 28 * 4 bytes = 112 bytes, que es suficiente
  window.crypto.getRandomValues(array);
  return Array.from(array, (dec) => ("0" + dec.toString(16)).slice(-2)).join(
    ""
  );
}

/**
 * Codifica un ArrayBuffer en formato Base64URL-safe.
 * Esto es necesario para el code_challenge. Reemplaza caracteres no seguros en URLs.
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
  let base64 = window.btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Crea el code_challenge a partir del code_verifier usando SHA-256.
 * El challenge es el hash SHA-256 del verifier, codificado en Base64URL.
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

export { generateCodeVerifier, generateCodeChallenge };
