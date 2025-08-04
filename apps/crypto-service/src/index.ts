import { decryptToken, encryptToken } from "./handlers/symetric-operation";
import { DecryptError, EncryptError, GeneralCryptoError } from "../lib/errors";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Hono } from "hono";
import {
  base64ToArrayBuffer,
  importRsaPrivateKey,
} from "./handlers/decrypt-hybrid-payload";
import { ServiceResponse, ErrorDetails } from "@base/shared-types";

const isValidString = (value: any): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

export default class CryptoService extends WorkerEntrypoint<Env> {
  private app = new Hono();

  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request, this.env, this.ctx);
  }

  /**
   * Ejecuta una operación de criptografía simétrica (encriptación o desencriptación).
   * Este método utiliza una única clave secreta (configurada en la variable ENCRYPTION_KEY)
   * para ambas acciones. Es ideal para asegurar datos como tokens de acceso o información sensible
   * donde el mismo servicio que encripta también desencripta.
   *
   * @param params - El objeto que define la operación a realizar.
   * @param params.action - La acción a ejecutar: 'encrypt' o 'decrypt'.
   * @param params.data - La cadena de texto a procesar.
   * @returns Una promesa que se resuelve en un `ServiceResponse` con el resultado.
   */
  async symmetricOperation(params: {
    action: "encrypt" | "decrypt";
    data: string;
  }): Promise<ServiceResponse<string, ErrorDetails>> {
    try {
      // Validación de parámetros centralizada
      if (!params || !params.action || !params.data) {
        throw new GeneralCryptoError({
          name: "PARAMETER_NOT_FOUND",
          message: "La petición debe incluir 'action' y 'data'.",
        });
      }

      if (!isValidString(params.data)) {
        throw new GeneralCryptoError({
          name: "INVALID_FORMAT",
          message: "El campo 'data' debe ser una cadena de texto no vacía.",
        });
      }

      const { action, data } = params;
      const secretKey = this.env.ENCRYPTION_KEY;

      // Enrutador de acciones
      switch (action) {
        case "encrypt": {
          console.log("Symmetric action: Encrypting...");
          let encrypted: string;
          try {
            encrypted = await encryptToken(data, secretKey);
          } catch (encryptError) {
            throw new EncryptError({
              name: "ENCRYPTION_FAILED",
              message: "El proceso de encriptación falló.",
              cause: encryptError,
            });
          }

          if (!encrypted || typeof encrypted !== "string") {
            throw new EncryptError({
              name: "INVALID_ENCRYPTION",
              message:
                "El proceso de encriptación devolvió un resultado no válido.",
            });
          }

          return { success: true, data: encrypted };
        }

        case "decrypt": {
          console.log("Symmetric action: Decrypting...");
          let decrypted: string;
          try {
            decrypted = await decryptToken(data, secretKey);
          } catch (decryptError) {
            throw new DecryptError({
              name: "DECRYPTION_FAILED",
              message:
                "No se pudo desencriptar el texto. Puede que esté corrupto o haya sido encriptado con una clave diferente.",
              cause: decryptError,
            });
          }

          return { success: true, data: decrypted };
        }

        default:
          // Esto previene que se pasen acciones inválidas
          throw new GeneralCryptoError({
            name: "INVALID_FORMAT",
            message: `La acción '${action}' no es válida. Use 'encrypt' o 'decrypt'.`,
          });
      }
    } catch (error) {
      console.error("Error en symmetricOperation:", error);

      if (
        error instanceof GeneralCryptoError ||
        error instanceof EncryptError ||
        error instanceof DecryptError
      ) {
        return {
          success: false,
          error: { name: error.name, message: error.message },
        };
      }

      return {
        success: false,
        error: {
          name: "INTERNAL_ERROR",
          message: "An unexpected error occurred.",
        },
      };
    }
  }

  /**
   * @summary Desencripta un payload asegurado mediante encriptación híbrida (AES+RSA).
   * @description Utiliza un esquema de "doble caja fuerte": una clave privada RSA (seleccionada por `keyIdentifier`)
   * desencripta una clave simétrica AES, la cual a su vez desencripta los datos principales.
   * Su propósito es garantizar la **confidencialidad** de la información.
   * @note Este método es para desencriptación y **no debe** usarse para verificar firmas digitales (ej. JWTs).
   * Estándar moderno y seguro (RSA/PKCS#8/OAEP/SHA-256).
   */
  async decryptHybridPayload(params: {
    keyIdentifier: string;
    payload: {
      type: "encrypted";
      data: string;
      key: string;
      iv: string;
    };
  }): Promise<ServiceResponse<string, ErrorDetails>> {
    try {
      if (
        !params ||
        !params.keyIdentifier ||
        !params.payload ||
        params.payload.type !== "encrypted"
      ) {
        throw new GeneralCryptoError({
          name: "PARAMETER_NOT_FOUND",
          message: "Parámetros inválidos para decryptHybridPayload.",
        });
      }

      const { keyIdentifier, payload } = params;
      let privateKeyPem: string | undefined;

      switch (keyIdentifier) {
        case "LOGS_V1":
          privateKeyPem = this.env.LOGS_PRIVATE_KEY;
          console.log("PRUEBA LLAVE => ", privateKeyPem);
          break;
        // case 'PAYMENTS_V2':
        //   privateKeyPem = this.env.PAYMENTS_SECRET;
        //   break;
        default:
          throw new GeneralCryptoError({
            name: "INVALID_FORMAT",
            message: `Identificador de clave desconocido: ${keyIdentifier}`,
          });
      }

      if (!privateKeyPem) {
        throw new GeneralCryptoError({
          name: "PRIVATE_KEY_NOT_FOUND",
          message: `La clave para el identificador '${keyIdentifier}' no está configurada.`,
        });
      }

      // Lógica de desencriptación
      const privateKey = await importRsaPrivateKey(privateKeyPem);

      const aesKeyBuffer = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        base64ToArrayBuffer(payload.key)
      );
      const aesKey = await crypto.subtle.importKey(
        "raw",
        aesKeyBuffer,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );
      const decryptedPayload = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToArrayBuffer(payload.iv) },
        aesKey,
        base64ToArrayBuffer(payload.data)
      );

      const decryptedText = new TextDecoder().decode(decryptedPayload);

      return { success: true, data: decryptedText };
    } catch (error: any) {
      console.error(
        `Error en decryptHybridPayload con keyIdentifier ${params?.keyIdentifier}:`,
        error
      );

      if (
        error instanceof GeneralCryptoError ||
        error instanceof DecryptError
      ) {
        return {
          success: false,
          error: { name: error.name, message: error.message },
        };
      }

      // Captura de errores específicos de la API de Crypto
      return {
        success: false,
        error: {
          name: "DECRYPTION_FAILED",
          message: `Fallo en la operación de criptografía: ${error.message}`,
        },
      };
    }
  }

  /*
  async createScopedJWT(params: {
    keyIdentifier: string;
    claims: {
      userId: string;
      organizationId: string;
      [key: string]: any; // Permite otros claims
    };
    audience: string;
    expiresIn: string;
  }): Promise<ServiceResponse<string, ErrorDetails>> {
    try {
      const { keyIdentifier, claims, audience, expiresIn } = params;

      // 1. Enrutador de Claves: Mapea el alias a la clave de firma
      let privateKeyJwkString: string | undefined;
      switch (keyIdentifier) {
        case "NEON_RLS_V1":
          privateKeyJwkString = this.env.NEON_PRIVATE_KEY_JWK;
          break;
        // Agrega otros casos si tienes más claves de firma
        default:
          throw new GeneralCryptoError({
            name: "UNKNOWN_KEY_IDENTIFIER",
            message: `Identificador de clave de firma desconocido: ${keyIdentifier}`,
          });
      }

      if (!privateKeyJwkString) {
        throw new GeneralCryptoError({
          name: "KEY_NOT_CONFIGURED",
          message: `La clave JWK para '${keyIdentifier}' no está configurada.`,
        });
      }

      const privateKeyJwk: JWK = JSON.parse(privateKeyJwkString);
      const privateKey = await importJWK(privateKeyJwk, privateKeyJwk.alg);

      // 2. Construir y firmar el JWT usando la lógica de 'jose'
      const jwt = await new SignJWT({
        organization_id: claims.organizationId,
        ...claims,
      })
        .setProtectedHeader({
          alg: privateKeyJwk.alg || "RS256",
          kid: privateKeyJwk.kid,
        })
        .setSubject(claims.userId)
        .setIssuer("https://generator.impretion.com") // Puede venir de `env`
        .setAudience(audience)
        .setExpirationTime(expiresIn)
        .setIssuedAt()
        .sign(privateKey);

      return { success: true, data: jwt };
    } catch (error: any) {
      console.error(
        `Error en createScopedJWT con keyIdentifier ${params?.keyIdentifier}:`,
        error
      );
      // ... tu manejo de errores robusto ...
      return {
        success: false,
        error: {
          name: "JWT_CREATION_FAILED",
          message: `Fallo en la creación del JWT: ${error.message}`,
        },
      };
    }
  }
   */
}
