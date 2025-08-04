/**
 * Sistema de Encriptación Seguro usando AES-256-GCM
 * Implementa las mejores prácticas de seguridad de la industria
 */

// Constantes de configuración
const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits para AES-GCM (recomendado)
const KEY_LENGTH = 32; // 256 bits
const TAG_LENGTH = 16; // 128 bits para el tag de autenticación

/**
 * Clase para manejo de errores de encriptación
 */
export class EncryptionError extends Error {
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = 'EncryptionError';
    }
}

/**
 * Utilidades para conversión de datos
 */
class CryptoUtils {
    /**
     * Convierte ArrayBuffer a string base64 de forma segura
     */
    static arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';

        // Procesar en chunks para evitar stack overflow con datos grandes
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, Array.from(chunk));
        }

        return btoa(binary);
    }

    /**
     * Convierte string base64 a ArrayBuffer de forma segura
     */
    static base64ToArrayBuffer(base64: string): ArrayBuffer {
        // Validar formato base64
        if (!this.isValidBase64(base64)) {
            throw new EncryptionError(
                'Cadena base64 inválida',
                'INVALID_BASE64'
            );
        }

        try {
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);

            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            return bytes.buffer;
        } catch (error) {
            throw new EncryptionError(
                'Error al decodificar base64: ' + (error as Error).message,
                'BASE64_DECODE_ERROR'
            );
        }
    }

    /**
     * Valida si una cadena es base64 válida
     */
    static isValidBase64(str: string): boolean {
        // Regex para validar base64
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

        // Verificar formato básico
        if (!base64Regex.test(str)) {
            return false;
        }

        // Verificar longitud (debe ser múltiplo de 4)
        if (str.length % 4 !== 0) {
            return false;
        }

        return true;
    }

    /**
     * Genera una clave hexadecimal segura
     */
    static generateSecureKey(): string {
        const keyBytes = crypto.getRandomValues(new Uint8Array(KEY_LENGTH));
        return Array.from(keyBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Valida la clave de encriptación
     */
    static validateKey(key: string): void {
        if (!key) {
            throw new EncryptionError(
                'La clave de encriptación es requerida',
                'MISSING_KEY'
            );
        }

        if (typeof key !== 'string') {
            throw new EncryptionError(
                'La clave debe ser una cadena',
                'INVALID_KEY_TYPE'
            );
        }

        if (key.length !== KEY_LENGTH * 2) {
            throw new EncryptionError(
                `La clave debe ser una cadena hexadecimal de ${KEY_LENGTH * 2} caracteres`,
                'INVALID_KEY_LENGTH'
            );
        }

        // Verificar que sea hexadecimal válido
        if (!/^[0-9a-fA-F]+$/.test(key)) {
            throw new EncryptionError(
                'La clave debe contener solo caracteres hexadecimales',
                'INVALID_KEY_FORMAT'
            );
        }
    }
}

/**
 * Clase principal para encriptación/desencriptación
 */
export class SecureEncryption {
    private static encoder = new TextEncoder();
    private static decoder = new TextDecoder();

    /**
     * Convierte una clave hexadecimal a CryptoKey
     */
    private static async getCryptoKey(secretKey: string): Promise<CryptoKey> {
        CryptoUtils.validateKey(secretKey);

        try {
            // Convertir hex a bytes
            const keyBytes = new Uint8Array(
                secretKey.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
            );

            return await crypto.subtle.importKey(
                'raw',
                keyBytes,
                { name: ALGORITHM },
                false,
                ['encrypt', 'decrypt']
            );
        } catch (error) {
            throw new EncryptionError(
                'Error al crear la clave criptográfica: ' + (error as Error).message,
                'KEY_CREATION_ERROR'
            );
        }
    }

    /**
     * Encripta un texto usando AES-256-GCM
     * @param plaintext - Texto a encriptar
     * @param secretKey - Clave secreta en formato hexadecimal (64 caracteres)
     * @returns String encriptado en formato "iv:ciphertext" (base64)
     */
    static async encrypt(plaintext: string, secretKey: string): Promise<string> {
        if (!plaintext || typeof plaintext !== 'string') {
            throw new EncryptionError(
                'El texto a encriptar debe ser una cadena no vacía',
                'INVALID_PLAINTEXT'
            );
        }

        try {
            const key = await SecureEncryption.getCryptoKey(secretKey);

            // Generar IV aleatorio
            const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

            // Encriptar
            const ciphertextBuffer = await crypto.subtle.encrypt(
                {
                    name: ALGORITHM,
                    iv: iv,
                    tagLength: TAG_LENGTH * 8 // en bits
                },
                key,
                SecureEncryption.encoder.encode(plaintext)
            );

            // Convertir a base64
            const ivBase64 = CryptoUtils.arrayBufferToBase64(iv.buffer);
            const ciphertextBase64 = CryptoUtils.arrayBufferToBase64(ciphertextBuffer);

            const result = `${ivBase64}:${ciphertextBase64}`;

            // Información de debug (eliminar en producción)
            console.log('Datos encriptados:', {
                plaintext: plaintext,
                result: result,
                ivLength: ivBase64.length,
                ciphertextLength: ciphertextBase64.length,
                totalLength: result.length
            });

            return result;
        } catch (error) {
            if (error instanceof EncryptionError) {
                throw error;
            }
            throw new EncryptionError(
                'Error durante la encriptación: ' + (error as Error).message,
                'ENCRYPTION_ERROR'
            );
        }
    }

    /**
     * Desencripta una cadena encriptada
     * @param encryptedData - Datos encriptados en formato "iv:ciphertext"
     * @param secretKey - Clave secreta en formato hexadecimal
     * @returns Texto desencriptado
     */
    static async decrypt(encryptedData: string, secretKey: string): Promise<string> {
        if (!encryptedData || typeof encryptedData !== 'string') {
            throw new EncryptionError(
                'Los datos encriptados deben ser una cadena no vacía',
                'INVALID_ENCRYPTED_DATA'
            );
        }

        // Información de debug (eliminar en producción)
        console.log('Datos a desencriptar:', {
            data: encryptedData,
            length: encryptedData.length,
            type: typeof encryptedData,
            containsColon: encryptedData.includes(':')
        });

        // Limpiar espacios en blanco que puedan causar problemas
        const cleanedData = encryptedData.trim();

        const parts = cleanedData.split(':');
        if (parts.length !== 2) {
            throw new EncryptionError(
                `Formato de datos encriptados inválido. Esperado: "iv:ciphertext", recibido: "${cleanedData}" (${parts.length} partes)`,
                'INVALID_FORMAT'
            );
        }

        const [ivBase64, ciphertextBase64] = parts;

        if (!ivBase64 || !ciphertextBase64) {
            throw new EncryptionError(
                `IV o texto cifrado faltante. IV: "${ivBase64}", Ciphertext: "${ciphertextBase64}"`,
                'MISSING_COMPONENTS'
            );
        }

        // Validar que las partes parezcan base64
        if (!CryptoUtils.isValidBase64(ivBase64)) {
            throw new EncryptionError(
                `IV no tiene formato base64 válido: "${ivBase64}"`,
                'INVALID_IV_BASE64'
            );
        }

        if (!CryptoUtils.isValidBase64(ciphertextBase64)) {
            throw new EncryptionError(
                `Ciphertext no tiene formato base64 válido: "${ciphertextBase64}"`,
                'INVALID_CIPHERTEXT_BASE64'
            );
        }

        try {
            const key = await SecureEncryption.getCryptoKey(secretKey);

            // Convertir de base64 a ArrayBuffer
            const iv = CryptoUtils.base64ToArrayBuffer(ivBase64);
            const ciphertext = CryptoUtils.base64ToArrayBuffer(ciphertextBase64);

            // Validar tamaños
            if (iv.byteLength !== IV_LENGTH) {
                throw new EncryptionError(
                    `IV debe tener ${IV_LENGTH} bytes, pero tiene ${iv.byteLength}`,
                    'INVALID_IV_LENGTH'
                );
            }

            // Validar que el ciphertext tenga al menos el tamaño del tag
            if (ciphertext.byteLength < TAG_LENGTH) {
                throw new EncryptionError(
                    `Ciphertext debe tener al menos ${TAG_LENGTH} bytes para el tag de autenticación, pero tiene ${ciphertext.byteLength}`,
                    'INVALID_CIPHERTEXT_LENGTH'
                );
            }

            // Desencriptar
            const decryptedBuffer = await crypto.subtle.decrypt(
                {
                    name: ALGORITHM,
                    iv: iv,
                    tagLength: TAG_LENGTH * 8 // en bits
                },
                key,
                ciphertext
            );

            return SecureEncryption.decoder.decode(decryptedBuffer);
        } catch (error) {
            if (error instanceof EncryptionError) {
                throw error;
            }

            // Error específico para fallas de autenticación
            if (error instanceof Error && error.name === 'OperationError') {
                throw new EncryptionError(
                    'Fallo en la autenticación: los datos pueden haber sido alterados o la clave es incorrecta',
                    'AUTHENTICATION_FAILED'
                );
            }

            throw new EncryptionError(
                'Error durante la desencriptación: ' + (error as Error).message,
                'DECRYPTION_ERROR'
            );
        }
    }

    /**
     * Genera una nueva clave segura
     */
    static generateKey(): string {
        return CryptoUtils.generateSecureKey();
    }
}

// Funciones standalone para máxima compatibilidad y prevenir errores de contexto
export async function encryptToken(plaintext: string, secretKey: string): Promise<string> {
    return SecureEncryption.encrypt(plaintext, secretKey);
}

export async function decryptToken(encryptedData: string, secretKey: string): Promise<string> {
    return SecureEncryption.decrypt(encryptedData, secretKey);
}

export function generateEncryptionKey(): string {
    return SecureEncryption.generateKey();
}

// Ejemplo de uso:
/*
const key = SecureEncryption.generateKey();
console.log('Clave generada:', key);

const plaintext = "Información confidencial";
const encrypted = await SecureEncryption.encrypt(plaintext, key);
console.log('Encriptado:', encrypted);

const decrypted = await SecureEncryption.decrypt(encrypted, key);
console.log('Desencriptado:', decrypted);
*/