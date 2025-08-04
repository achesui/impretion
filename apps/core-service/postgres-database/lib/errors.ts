class ErrorBase<T extends string> extends Error {
    public details?: Record<string, any>;
    public override message: string;

    constructor({
        name,
        message,
        cause,
    }: {
        name: T;
        message: string | Record<string, any>;
        cause?: any;
    }) {
        const stringMessage = typeof message === 'string' ? message : '[Structured Error]';
        super(stringMessage);
        this.name = name;
        this.message = stringMessage;
        if (typeof message === 'object') {
            this.details = message;
        }
        this.cause = cause;
    }
}


// Saga errors
type ConsumerErrorNames = 'INSUFFICIENT_BALANCE';
export class ConsumerError extends ErrorBase<ConsumerErrorNames> { }