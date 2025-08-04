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
        this.cause = cause;
    }
}

type CryptoErrorNames = "UNABLE_TO_ENCRYPT_ACCESS_OR_REFRESH_TOKEN" | "UNABLE_TO_DECRYPT_TOKENS";
export class CryptoError extends ErrorBase<CryptoErrorNames> { }

type GeneralErrorNames = 'SECRETS_NOT_FOUND' | "ACCESS_NOT_FOUND" | "SERVICE_BINDING_ERROR" | "INCORRECT_DATA";
export class GeneralError extends ErrorBase<GeneralErrorNames> { }

type DbErrorNames = "UNABLE_TO_CONNECT_TO_DB" | "UNABLE_TO_INSERT_DATA" | "UNABLE_TO_RETRIEVE_DATA" | "UNABLE_TO_DELETE_DATA";
export class DbError extends ErrorBase<DbErrorNames> { }

type KvErrorNames = "UNABLE_TO_PUT_DATA" | "UNABLE_TO_DELETE_DATA" | "UNABLE_TO_GET_DATA";
export class KvError extends ErrorBase<KvErrorNames> { }

type CalendlyErrorNames = "UNABLE_TO_REVOKE_TOKEN" | "UNABLE_TO_RETRIEVE_TOKEN";
export class CalendlyError extends ErrorBase<CalendlyErrorNames> { }

type CalendlyAccessErrorNames = "ENCRYPTION_ERROR";
export class CalendlyAccessError extends ErrorBase<CalendlyAccessErrorNames> { }

type IntegrationErrorNames = "UNABLE_TO_INSERT_INTEGRATION" | "UNABLE_TO_DELETE_INTEGRATION" | "UNABLE_TO_RETRIEVE_INTEGRATION";
export class IntegrationError extends ErrorBase<IntegrationErrorNames> { }