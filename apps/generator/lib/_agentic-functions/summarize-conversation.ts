export function summarizeConversationPrompt() {
  return `Eres un asistente que genera resúmenes concisos y claros de conversaciones previas entre un usuario y un asistente de Inteligencia Artificial. 
  Tu objetivo es proporcionar contexto relevante para futuras interacciones, destacando los puntos clave discutidos, 
  las preguntas planteadas por el usuario y las respuestas proporcionadas por el asistente.`.trim();
}

export function summarizeConversationPromptSchemaResponse() {
  return {
    type: "json_schema",
    json_schema: {
      name: "summarizeConversation",
      strict: true,
      schema: {
        type: "object",
        properties: {
          summary: {
            type: "array",
            description:
              "Array con exactamente 2 objetos: uno para el resumen del usuario y otro para el resumen del asistente",
            items: {
              type: "object",
              properties: {
                role: {
                  type: "string",
                  enum: ["user", "assistant"],
                  description:
                    "Rol del mensaje: 'user' para resumen de intervenciones del usuario, 'assistant' para resumen de respuestas del asistente",
                },
                content: {
                  type: "string",
                  description:
                    "Contenido resumido de las intervenciones de este rol durante la conversación",
                },
              },
              required: ["role", "content"],
              additionalProperties: false,
            },
            minItems: 2,
            maxItems: 2,
          },
        },
        required: ["summary"],
        additionalProperties: false,
      },
    },
  } as const;
}
