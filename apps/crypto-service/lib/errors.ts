class ErrorBase<T extends string> extends Error {
  constructor({
    name,
    message,
    cause,
  }: {
    name: T;
    message: string;
    cause?: any;
  }) {
    super();
    this.name = name;
    this.message = message;
  }
}

type GeneralCryptoErrorNames =
  | "INVALID_JSON"
  | "PARAMETER_NOT_FOUND"
  | "INVALID_FORMAT"
  | "SIMETRIC_ENCRYPTION_KEY_NOT_FOUND"
  | "PRIVATE_KEY_NOT_FOUND";
export class GeneralCryptoError extends ErrorBase<GeneralCryptoErrorNames> {}

type EncryptErrorNames = "ENCRYPTION_FAILED" | "INVALID_ENCRYPTION";
export class EncryptError extends ErrorBase<EncryptErrorNames> {}

type DecryptErrorNames = "INVALID_CIPHERTEXT" | "DECRYPTION_FAILED";
export class DecryptError extends ErrorBase<DecryptErrorNames> {}
