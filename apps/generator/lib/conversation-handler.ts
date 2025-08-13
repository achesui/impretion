import { ServiceResponse, UserData } from "@base/shared-types";
import {
  ChatCompletionProps,
  ChatCompletionsHelpers,
  DurableObjectSQL,
  UserMessageState,
} from "../src/types";
import { newGeneration } from "./generation-handler/new-generation";

type ConversationHandlerSchema<TAgentContext> = {
  sql: DurableObjectSQL;
  userData: UserData;
  stateHelpers: ChatCompletionsHelpers<TAgentContext>;
  userMessage: string;
  assistantMessage: string;
  timestamps: {
    userMessageTimestamp: Date;
    assistantMessageTimestamp: Date;
  };
  env: Env;
};

export async function conversationHandler<TAgentContext>({
  sql,
  userData,
  stateHelpers,
  userMessage,
  assistantMessage,
  timestamps,
  env,
}: ConversationHandlerSchema<TAgentContext>): Promise<
  ServiceResponse<null, null>
> {
  const { state, setState } = stateHelpers;
  const { assistantMessageTimestamp, userMessageTimestamp } = timestamps;

  // Inserción de mensajes en la tabla de conversación completa.
  sql`
  INSERT INTO full_conversation (role, content, timestamp)
  VALUES ('user', ${userMessage}, ${userMessageTimestamp.toISOString()}),
         ('assistant', ${assistantMessage}, ${assistantMessageTimestamp.toISOString()})
  `;

  // Manejo de estado de la conversación de los ultimos 12 mensajes.
  setState({
    ...state,
    lastConversationMessages: [
      ...(state.lastConversationMessages.slice(-10) || []),
      { role: "user", content: userMessage, timestamp: new Date() },
      { role: "assistant", content: assistantMessage, timestamp: new Date() },
    ],
  });

  // Incrementar el contador de mensajes para resumir la conversación, al llegar a 10 se hace un resumen.
  state.conversationState.messageCountForSummarization += 2;

  // Manejo de mensajes en la tabla de resúmenes de conversación para la IA - cada 10 mensajes se hace un resumen y se convierte en 2 mensajes resumidos con puntos clave.
  if (state.conversationState.messageCountForSummarization % 12 === 0) {
    // Resumen de los últimos 12 mensajes. Obtenemos los últimos 12 mensajes de la conversación directamente del estado.
    const recentMessages = state.lastConversationMessages;

    // Obtenemos los mensajes y los convertimos a un formato adecuado para el resumen (eliminando 'timestamp').
    const messages = [];
    recentMessages.map((message) => {
      messages.push({
        role: message.role,
        content: message.content,
      });
    });

    await newGeneration({
      body: {
        message: "messages",
        connectionType: "agentic",
        source: "website",
        userData,
        subscriptions: [],
        from: "impretion",
        to: "impretion",
        timestamp: new Date(),
        isInternal: false,
      },
      env,
      stateHelpers,
    });

    // Insertar el resumen en la tabla de resúmenes.
    sql`
    INSERT INTO conversation_summaries (role, content, timestamp)
    VALUES ('system', ${"summary"}, ${new Date().toISOString()})
    `;

    // Resetear el contador.
    state.conversationState.messageCountForSummarization = 0;
  }

  sql`
  INSERT INTO conversation_summaries (role, content, timestamp)
  VALUES ('user', ${userMessage}, ${new Date().toISOString()}),
         ('assistant', ${assistantMessage}, ${new Date().toISOString()})
  `;

  //console.log(state);
  //console.log(state.actionState?.appointments);

  // Aquí se hace una optimización de la conversación con IA para resumir el context length
  return {
    success: true,
    data: null,
  };
}

/*
export async function conversationHandler ({
 state: UserMessageState,
 setState: (state: UserMessageState) => void
}): Promise<ProcessedResponse> {
 try {
   return {
     success: true,
     message: {
       conversationReceptor: userIdentifier,
       conversationId: 1,
     },
   };

  
    * Nos aseguramos que el identificador de usuario exista en la tabla 'conversations', si no existe, se crea una nueva.
    * Buscar directamente el valor hash y coincidir con el id de la organización
   
   const getConversationByIdentifier = `SELECT *
       FROM conversations
       WHERE "to" = $1 AND "organization_id" = $2;`;

   const conversation = (
     await client.query(getConversationByIdentifier, [
       userIdentifier,
       organizationId,
     ])
   ).rows[0];

   // Si no existe una conversación, insertamos una nueva
   if (!conversation) {
     console.log("no existe la conversación");
     const insertConversation = `
         INSERT INTO conversations ("from", "to", "source", "user_context", "organization_id", "created_at")
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, "from", "to", "source", "user_context", "organization_id", "created_at";
         `;
     const newConversation = (
       await client.query(insertConversation, [
         from,
         userIdentifier,
         source,
         null,
         organizationId,
       ])
     ).rows[0];

     console.log("nueva conversación: ", newConversation);

     if (source === "chatbots") {
       const insertPresentationMessageQuery = `
           INSERT INTO messages (conversation_id, sender, content, model_used, assistant_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, sender, content, created_at;
       `;

       const result = await client.query(insertPresentationMessageQuery, [
         newConversation.id,
         "assistant",
         "gpt-4o-mini",
         assistantId,
         new Date(),
       ]);

       const insertedMessage = result.rows[0];
       if (!insertedMessage.id) {
         // [DBLOG] -> El mensaje no se insertó correctamente, continuamos el flujo, pero agregamos a los logs de Impretion.
       }
     }

     if (!newConversation.id) {
       throw new UserError({
         name: "CONVERSATION_ERROR",
         message: "Ha ocurrido un error al insertar la nueva conversación",
       });
     }

     return {
       success: true,
       message: {
         conversationReceptor: newConversation.to,
         conversationId: newConversation.id,
       },
     };
   }

   return {
     success: true,
     message: {
       conversationReceptor: conversation.to,
       conversationId: conversation.id,
     },
   };
 
 } catch (error) {
   console.error("Error. ", error);
   return { success: false, error: null };
 }
};
  */
