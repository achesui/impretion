import {
  ActionProcessing,
  EditActionConfigurationArgs,
} from "../../../src/types";
import { newGeneration } from "../../../lib/generation-handler/new-generation";

export const editActionConfiguration = async <TAgentContext>({
  helpers,
  functionType,
  functionArguments,
  assistantId,
  actionConfiguration,
  metadata, // Los metadatos tienen el tipo de conexión (únicamente Whatsapp en la primera versión)
  directConnections,
  userId,
  env,
}: ActionProcessing<TAgentContext, EditActionConfigurationArgs>): Promise<
  string | null
> => {
  const { naturalLanguageQuery } = functionArguments;

  /**
   * Petición agentica sobre consultas en la base de datos del usuario de forma generica.
   * connectedWith - Número del usuario haciendo la petición.
   * organizationId - Id de la organización del usuario.
   */
  const { organizationId } = metadata;

  // Necesitamos el actionId para apuntar a la acción a editar.
  // Para obtener el actionId podemos usar el id del usuario. Para obtener las notificaciones suscritas.
  const actionId = "30427eb0-ea24-4cc8-a1c8-f3751570f417"; // Dato hardcodeado

  const currentActionSchema = await env.CORE_SERVICE.mainDatabaseHandler({
    type: "actions",
    query: {
      method: "getActionById",
      data: { id: actionId, withConfiguration: true },
    },
    userData: {
      organizationId,
    },
  });

  if (!currentActionSchema.success) {
    return "Ha ocurrido un error";
  }

  // Se accede al campo configuration de la acción actual y luego al campo "configuration" del action_configuration.
  const { configuration } = currentActionSchema.data as Record<string, any>;
  const { configuration: currentActionConfigurationSchema } = configuration;

  console.log("belnie => ", currentActionConfigurationSchema);

  const userQuery = `Aquí está el estado JSON actual que debes modificar. Úsalo como referencia.

  Estado Actual:
  \`\`\`json
  ${currentActionConfigurationSchema}
  \`\`\`
  
  ---
  
  Ahora, procesa la siguiente petición y genera el parche de actualización.
  
  Petición:
  "${naturalLanguageQuery}"`;

  const response = await newGeneration({
    helpers,
    env,
    body: {
      connectedWith: "",
      connectionType: "agentic",
      message: userQuery,
      organizationId,
      directConnections: [],
      subscribedToAssistant: "",
      from: null,
      isInternal: true,
      source: "editActionConfiguration",
      userId,
    },
  });

  if (!response.success) return null;

  const modifiedSchema = JSON.parse(response.data.content);
  const queryResultResponse = await env.CORE_SERVICE.mainDatabaseHandler({
    type: "actions",
    query: {
      data: {
        schema: modifiedSchema,
        currentActionConfigurationSchema,
        actionId,
      },
      method: "editActionConfigurationQuery",
    },
    userData: {
      organizationId,
      userId,
    },
  });

  console.log(
    "ORGANITZAZAOOOOOOOOO -------------------> ",
    queryResultResponse,
  );

  return "queryResult";
};

/**
 * ------ EDIT ACTION CONFIGURATION ------
 * Permite la edición de los JSONB en la base de datos encargado de la configuración y en un futuro del esquema de las acciones.
 */
export function editActionConfigurationTool() {
  return {
    name: "editActionConfiguration",
    description:
      "Edits the configuration of the system based on user instructions. Call this when the user wants to change labor hours, rest periods, etc.",
    strict: true,
    parameters: {
      type: "object",
      required: ["naturalLanguageQuery"],
      properties: {
        naturalLanguageQuery: {
          type: "string",
          description:
            "User's natural language instruction specifying the change in a very detailed way. The current day is Thursday, 03-07-2025. Be very specific with the dates if any, and always provide dates in full format (e.g., Friday, 04-07-2025).",
        },
      },
      additionalProperties: false,
    },
  };
}

export function editActionConfigurationPrompt() {
  return `
  ### ROL Y OBJETIVO ### Eres un asistente de IA experto en manipulación de datos JSON. Tu función es actuar como un \"Procesador de Cambios Atómicos\". 
  Tu operación se basa en tres artefactos: 
  1. Una \`Petición\` del usuario. 
  2. Un \`Estado Actual\` en formato JSON. 
  3. Un \`response_format\` que es tu guía de estructura. Tu única tarea es analizar la \`Petición\`, compararla con el \`Estado Actual\` y generar un objeto de parche que se adhiera ESTRICTAMENTE al \`response_format\`. 
  ### PRINCIPIOS FUNDAMENTALES (NO NEGOCIABLES) 
  ### 1.  **FIDELIDAD AL ESQUEMA:** El \`response_format\` es tu única fuente de verdad sobre la estructura de la salida. Las \`description\` dentro del esquema son las reglas de negocio que debes obedecer sin excepción. 
  ### 2.  **PRINCIPIO DE CAMBIO ATÓMICO:** Esta es tu regla más importante. Tu respuesta debe reflejar ÚNICAMENTE los cambios en los valores finales (atómicos: strings, números, booleanos) que se derivan DIRECTAMENTE de la \`Petición\` del usuario. - **No infieras, no completes, no rellenes.** Tu trabajo no es crear objetos \"completos\", sino reportar \"diferencias\". - **Aplicación Universal:** Esta regla se aplica a TODOS los niveles de anidación del JSON. Si un objeto anidado es modificado, el principio se aplica de nuevo a sus propias propiedades. - **Ejemplo Conceptual:** Si el usuario pide cambiar un campo 'X' dentro de un objeto que contiene 'X', 'Y', y 'Z', la porción del parche para ese objeto DEBE ser \`{\\\"X\\\": nuevo_valor, \\\"Y\\\": null, \\\"Z\\\": null}\`. 
  ### 3.  **REFERENCIA, NO COPIA:** El \`Estado Actual\` es solo para consulta. Te sirve para saber el valor de un campo *antes* de que el usuario pida cambiarlo. NO debes copiar ningún valor del \`Estado Actual\` a tu respuesta. Tu respuesta se construye desde cero, con \`null\`s por defecto, y solo se rellenan los valores atómicos que la \`Petición\` del usuario te ordena cambiar.
  `;
}

export function editActionConfigurationSchemaResponse() {
  return {
    type: "json_schema",
    json_schema: {
      name: "configuration_patch",
      strict: true,
      schema: {
        title: "Generador de Parches de Configuración v5 (Directo y Atómico)",
        description:
          "Tu misión es generar un 'parche' de actualización DIRECTO. La regla de oro es el **PRINCIPIO DE CAMBIO ATÓMICO**: solo las propiedades finales (strings, números, booleanos) que el usuario pide cambiar explícitamente deben tener un valor. TODO lo demás (objetos, arrays, y otras propiedades no modificadas) DEBE ser 'null'. Si la petición del usuario no implica ningún cambio, el objeto de respuesta debe contener `null` para TODAS sus propiedades de primer nivel (ej: 'schedule', 'startDate', etc.).",
        type: "object",
        properties: {
          schedule: {
            type: ["object", "null"],
            description:
              "Actualizaciones del horario. Si el usuario no cambia nada del horario, este objeto entero DEBE ser 'null'.",
            properties: {
              value: {
                type: ["object", "null"],
                description:
                  "Cambios para días específicos. Si un día no se modifica, debe ser 'null'. Si un día se modifica, se debe usar la definición 'daySchedule' que fuerza la precisión atómica.",
                properties: {
                  monday: {
                    $ref: "#/$defs/daySchedule",
                  },
                  tuesday: {
                    $ref: "#/$defs/daySchedule",
                  },
                  wednesday: {
                    $ref: "#/$defs/daySchedule",
                  },
                  thursday: {
                    $ref: "#/$defs/daySchedule",
                  },
                  friday: {
                    $ref: "#/$defs/daySchedule",
                  },
                  saturday: {
                    $ref: "#/$defs/daySchedule",
                  },
                  sunday: {
                    $ref: "#/$defs/daySchedule",
                  },
                },
                required: [
                  "monday",
                  "tuesday",
                  "wednesday",
                  "thursday",
                  "friday",
                  "saturday",
                  "sunday",
                ],
                additionalProperties: false,
              },
            },
            required: ["value"],
            additionalProperties: false,
          },
          startDate: {
            type: ["object", "null"],
            description:
              "Actualización para la fecha de inicio. Si no se modifica, DEBE ser 'null'.",
            properties: {
              value: {
                type: ["string", "null"],
                format: "date",
                description:
                  "El nuevo valor para la fecha. Si no cambia, es 'null'.",
              },
            },
            required: ["value"],
            additionalProperties: false,
          },
          slotInterval: {
            type: ["object", "null"],
            description:
              "Actualización para el intervalo. Si no se modifica, DEBE ser 'null'.",
            properties: {
              value: {
                type: ["number", "null"],
                description:
                  "El nuevo valor para el intervalo. Si no cambia, es 'null'.",
              },
            },
            required: ["value"],
            additionalProperties: false,
          },
          maxAppointmentsPerDay: {
            type: ["object", "null"],
            description:
              "Actualización de citas máximas. Si no se modifica, DEBE ser 'null'.",
            properties: {
              value: {
                type: ["object", "null"],
                description:
                  "Nuevos valores. Si una propiedad como 'isAuto' no cambia, DEBE ser 'null'.",
                properties: {
                  value: {
                    type: ["number", "null"],
                    description: "Nuevo valor. Si no cambia, es 'null'.",
                  },
                  isAuto: {
                    type: ["boolean", "null"],
                    description: "Nuevo estado. Si no cambia, es 'null'.",
                  },
                },
                required: ["value", "isAuto"],
                additionalProperties: false,
              },
            },
            required: ["value"],
            additionalProperties: false,
          },
        },
        required: [
          "schedule",
          "startDate",
          "slotInterval",
          "maxAppointmentsPerDay",
        ],
        additionalProperties: false,
        $defs: {
          daySchedule: {
            type: ["object", "null"],
            title: "Parche de Horario Diario (Precisión Atómica)",
            description:
              "REGLA CRÍTICA Y UNIVERSAL: Cuando actualices este objeto, debes aplicar el 'Principio de Cambio Atómico'. Solo la propiedad específica que el usuario mencionó en su petición debe recibir un valor. TODAS las demás propiedades dentro de este objeto DEBEN ser 'null' si no fueron mencionadas. **Ejemplo conceptual:** Si un objeto tiene las propiedades 'propA', 'propB' y 'propC', y el usuario solo pide cambiar 'propA', la respuesta para este objeto debe ser `{'propA': nuevo_valor, 'propB': null, 'propC': null}`.",
            properties: {
              startTime: {
                type: ["string", "null"],
                pattern: "^\\d{2}:\\d{2}$",
              },
              endTime: {
                type: ["string", "null"],
                pattern: "^\\d{2}:\\d{2}$",
              },
              isEnabled: {
                type: ["boolean", "null"],
              },
            },
            required: ["startTime", "endTime", "isEnabled"],
            additionalProperties: false,
          },
        },
      },
    },
  } as const;
}
