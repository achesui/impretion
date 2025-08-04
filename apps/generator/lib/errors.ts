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

/* DB ERRORS */
type DatabaseErrorNames = "ERROR_CONNECTING_DB";
export class DBError extends ErrorBase<DatabaseErrorNames> {}

/* ACTION QUERY ERRORS - Error al hacer queries relacionadas al conjunto de tablas de acciones. */
type ActionQueryErrorNames = "ACTION_QUERY_ERROR";
export class ActionQueryError extends ErrorBase<ActionQueryErrorNames> {
  cause?: Error;

  constructor({
    name,
    message,
    cause,
  }: {
    name: ActionQueryErrorNames;
    message: string;
    cause?: Error;
  }) {
    super({ name, message, stack: cause?.stack });
    this.cause = cause;
    if (cause) {
      this.stack += `\nCausa: ${cause.stack}`;
    }
  }
}

/*  */

/* FEEDBACK ERRORS - Errores de retroalimentación al usuario final por medio del asistente. */
type FeedbackErrorNames = "FEEDBACK_ERROR";
export class FeedbackError extends ErrorBase<FeedbackErrorNames> {}

type UserErrorNames = "IP_ERROR" | "CONVERSATION_ERROR" | "IDENTITY_ERROR";
export class UserError extends ErrorBase<UserErrorNames> {}

/* OPENAI ERROR MESSAGES */
type MessagesErrorNames = "CREATING_MESSAGE_ERROR" | "ERROR_OBTAINING_MESSAGES";
export class OpenAIMessagesError extends ErrorBase<MessagesErrorNames> {}

type ThreadErrorNames = "ERROR_CREATING_THREAD";
export class OpenAIThreadError extends ErrorBase<ThreadErrorNames> {}

type RunErrorNames = "CREATING_RUN_ERROR" | "ERROR_CANCELING_RUN" | "RUN_ERROR";
export class OpenAIRunsError extends ErrorBase<RunErrorNames> {}

type AssistantErrorNames = "ERROR_RETRIEVING_ASSISTANT";
export class OpenAIAssistantError extends ErrorBase<AssistantErrorNames> {}

type ChatCompletionsErrorNames = "REQUESTING_COMPLETATION_ERROR";
export class OpenAIChatCompletionsError extends ErrorBase<ChatCompletionsErrorNames> {}

/* GENERAL ERRORS - Errores enfocados en la ejecucion de multiples tareas de forma general, como llamada a un endpoint. */
type MessageAndRunErrorName =
  | "REQUIRED_PARAMETERS_ERROR"
  | "NULL_IDENTIFIERS"
  | "PROMISE_ERROR";
export class MessageAndRunError extends ErrorBase<MessageAndRunErrorName> {}

/* BINDING ERRORS - Errores de bindings de cloudflare */
type BindingErrorNames = "KV_ERROR" | "R2_ERROR";
export class BindingError extends ErrorBase<BindingErrorNames> {}

/* SCRAPPER ERROR - Errores de scraping */
type ScrappingErrorNames =
  | "FIRECRAWL_RESPONSE_ERROR"
  | "FIRECRAWL_UNSUCCESSFUL_RESPONSE";
export class ScrappingError extends ErrorBase<ScrappingErrorNames> {}

/* QUERY ERROR - Errores generales de consultas */
type QueryErrorNames = "QUERY_ERROR";
export class QueryError extends ErrorBase<QueryErrorNames> {}
