class ErrorBase<T extends string> extends Error {
  constructor({
    name,
    message,
    stack,
  }: {
    name: T;
    message: string;
    stack?: any;
  }) {
    super();
    this.name = name;
    this.message = message;
    this.stack = stack;
  }
}

/* WHATSAPP ERRORS */
type WhatsappErrorNames = "CONNECTION_NOT_FOUND" | "FORMDATA_MALFORMED";
export class WhatsappError extends ErrorBase<WhatsappErrorNames> { }
