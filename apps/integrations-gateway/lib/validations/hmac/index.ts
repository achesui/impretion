/**
 *
 * @param secretKey Clave secreta de la integración.
 * @param message Mensaje a validar ya estructurado para dinamismo.
 * @returns
 */
export async function hmacValidation({
  secretKey,
  message,
  hmac,
}: {
  secretKey: string;
  message: string;
  hmac: string;
}): Promise<boolean> {
  // La Web Crypto API requiere que la clave sea importada a un formato CryptoKey.
  // Primero, codificamos la clave secreta a un buffer de bytes (Uint8Array).
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);

  const key = await crypto.subtle.importKey(
    "raw", // El formato de la clave es un buffer de bytes crudo.
    keyData,
    { name: "HMAC", hash: "SHA-256" }, // El algoritmo que usaremos con esta clave.
    false, // La clave no debe ser extraíble.
    ["sign"], // El propósito de la clave es 'firmar' (crear un MAC).
  );

  // El mensaje también debe ser codificado a un Uint8Array.
  const messageData = encoder.encode(message);

  // El método 'sign' crea el Message Authentication Code.
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);

  // El resultado de 'sign' es un ArrayBuffer. Necesitamos convertirlo a un string hexadecimal
  // para poder compararlo con el hmac que nos envió Shopify.
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const generatedHmac = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  console.log("generatedHmac => ", generatedHmac);
  const isValid = crypto.subtle.timingSafeEqual(
    encoder.encode(hmac),
    encoder.encode(generatedHmac),
  );

  return isValid;
}
