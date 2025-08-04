import { UserMessageState } from "../src/types";
import { ServiceResponse } from "../../global";

type ConversationHandlerSchema = {
  state: UserMessageState;
  setState: (state: UserMessageState) => void;
  userMessage: string;
  assistantMessage: string;
};

export async function conversationHandler({
  state,
  setState,
  userMessage,
  assistantMessage,
}: ConversationHandlerSchema): Promise<ServiceResponse<null, null>> {
  // Manejo de estado de la conversación
  setState({
    ...state,
    conversationContext: [
      ...(state.conversationContext || []),
      { role: "user", content: userMessage },
      { role: "assistant", content: assistantMessage },
    ],
  });

  console.log(state);
  console.log(state.actionState?.appointments);

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
