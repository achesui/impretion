// --- FUNCIONES DE CRIPTOGRAFÍA Y HELPERS ---

/**
 * Importa una clave privada RSA desde un string en formato PEM (PKCS#8).
 */
export async function importRsaPrivateKey(pem: string): Promise<CryptoKey> {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  if (!pem.trim().startsWith(pemHeader) || !pem.trim().endsWith(pemFooter)) {
    throw new Error(
      "Formato de clave privada inválido. Se esperaba el formato PKCS#8 completo."
    );
  }
  const pemContents = pem
    .substring(pemHeader.length, pem.lastIndexOf(pemFooter))
    .replace(/\s+/g, "");
  const binaryDer = base64ToArrayBuffer(pemContents);
  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

/**
 * Desencripta un campo individual de log.
 */
export async function decryptField(
  privateKey: CryptoKey,
  fieldData: any
): Promise<any> {
  if (fieldData?.type !== "encrypted") {
    return fieldData;
  }
  try {
    const aesKeyBuffer = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      base64ToArrayBuffer(fieldData.key)
    );
    const aesKey = await crypto.subtle.importKey(
      "raw",
      aesKeyBuffer,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    const decryptedPayload = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToArrayBuffer(fieldData.iv) },
      aesKey,
      base64ToArrayBuffer(fieldData.data)
    );
    const decryptedText = new TextDecoder().decode(decryptedPayload);
    try {
      return JSON.parse(decryptedText);
    } catch {
      return decryptedText;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Fallo al desencriptar un campo. Error: ${errorMessage}`);
    return {
      __decryption_error__: errorMessage,
      __original_field__: fieldData,
    };
  }
}

/**
 * Helper para convertir una cadena base64 a un ArrayBuffer.
 */
export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary_string = atob(b64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Helper para leer un ReadableStream línea por línea.
 */
export async function* readLines(
  textStream: ReadableStream<string>
): AsyncGenerator<string> {
  const reader = textStream.getReader();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      let eolIndex;
      while ((eolIndex = buffer.indexOf("\n")) >= 0) {
        yield buffer.slice(0, eolIndex);
        buffer = buffer.slice(eolIndex + 1);
      }
    }
    if (buffer.length > 0) {
      yield buffer;
    }
  } finally {
    reader.releaseLock();
  }
}
