import { openRouter } from "../openrouter/completion";
import {
  Message,
  Tool,
  OpenRouterResponse,
  ResponseFormat,
} from "../openrouter/openrouter.types";
import functionCalling from "../../services";
import {
  ActionsConfiguration,
  AIGatewayMetadata,
  AssistantActionsData,
  ChatCompletionProps,
} from "../../src/types";

import {
  GetAssistantsResponse,
  GetCacheList,
  GetCollectionsResponse,
} from "@core-service/types";
import { agenticHandler } from "../../services/agentic-handler";
import { responseBuilder } from "./response-builder";
import { directConnectionPrompt } from "../direct-connection-prompt";
import { organizationalPrompt } from "../organizational-connection-prompt";
import { ServiceResponse } from "@base/shared-types";
import { ragTool } from "../_agentic-functions/rag";
import { databaseQueryTool } from "../_agentic-functions/database-query";
import { editActionConfigurationTool } from "../_agentic-functions/edit-action-configuration";

// Función para obtener tools y configuración directa
function getDirectConnectionData(): {
  actionsSchema: Tool[];
  actionConfiguration: ActionsConfiguration;
  systemPrompt: string;
} {
  const actionsSchema: Tool[] = [
    {
      type: "function",
      function: databaseQueryTool(),
    },
    {
      type: "function",
      function: editActionConfigurationTool(),
    },
  ];

  const actionConfiguration: ActionsConfiguration = {
    databaseQuery: {
      actionId: "",
      configurationData: {},
    },
    editActionConfiguration: {
      actionId: "",
      configurationData: {},
    },
  };

  return {
    actionsSchema,
    actionConfiguration,
    systemPrompt: directConnectionPrompt(),
  };
}

// Función para mapear datos organizacionales
async function mapOrganizationalData(
  getAssistant: GetAssistantsResponse,
  organizationId: string,
  source: string,
  env: Env,
): Promise<{
  actionsSchema: Tool[];
  actionConfiguration: ActionsConfiguration;
  systemPrompt: string;
}> {
  const assistantData = getAssistant[0];

  const hasLinkedActions =
    assistantData.linkedActions && assistantData.linkedActions.length > 0;
  const hasLinkedCollections =
    assistantData.linkedCollections &&
    assistantData.linkedCollections.length > 0;

  const systemPrompt = organizationalPrompt(
    assistantData.prompt,
    assistantData.linkedActions,
    assistantData.configuration.personalities,
  );

  // Si no hay acciones ni colecciones vinculadas, retornar datos básicos
  if (!hasLinkedActions && !hasLinkedCollections) {
    return {
      actionsSchema: [],
      actionConfiguration: {},
      systemPrompt,
    };
  }

  const assistantActionsData: AssistantActionsData = [];

  // Agregar acciones vinculadas si existen
  if (hasLinkedActions) {
    const linkedActionsData = assistantData.linkedActions!.map(
      ({ action }) => ({
        actionId: action.id,
        actionType: action.type,
        actionSchema: action.structure?.actionSchema as any,
        configuration: {
          configurationData: action.configuration?.configuration || {},
          actionId: action.id || "",
        },
      }),
    );
    assistantActionsData.push(...linkedActionsData);
  }

  // Agregar acción RAG si hay colecciones vinculadas
  if (hasLinkedCollections) {
    // Obtención de las colecciones actuales por medio del KV cache
    const currentCollectionsListResponse =
      await env.CORE_SERVICE.storageCacheHandler({
        type: "getCacheList",
        data: {
          organizationId,
          segments: [{ entity: "collections" }],
        },
      });

    let currentCollections: GetCollectionsResponse[] = [];

    if (currentCollectionsListResponse.success) {
      const collections =
        currentCollectionsListResponse.data as GetCacheList<GetCollectionsResponse>;
      currentCollections = collections.keys
        .map(({ metadata }) => metadata)
        .filter((metadata) =>
          assistantData.linkedCollections?.some(
            (linked) => linked.collectionId === metadata.id,
          ),
        );
    } else {
      // Fallback a base de datos
      const collectionsResponse = await env.CORE_SERVICE.mainDatabaseHandler({
        type: "knowledgeBase",
        userData: { organizationId },
        query: {
          method: "getCollections",
          data: {},
        },
      });

      if (collectionsResponse.success) {
        const allCollections =
          collectionsResponse.data as GetCollectionsResponse[];
        currentCollections = allCollections.filter((collection) =>
          assistantData.linkedCollections?.some(
            (linked) => linked.collectionId === collection.id,
          ),
        );
      }
    }

    // Solo agregar RAG si hay colecciones disponibles
    if (currentCollections.length > 0) {
      assistantActionsData.push({
        actionId: crypto.randomUUID(),
        actionType: "rag",
        actionSchema: ragTool(currentCollections),
        configuration: {},
      });
    }
  }

  // Crear esquemas de acciones y configuraciones
  const actionsSchema: Tool[] = assistantActionsData.map((row) => ({
    type: "function",
    function: row.actionSchema,
  }));

  const actionConfiguration: ActionsConfiguration = {};
  assistantActionsData.forEach((row) => {
    actionConfiguration[row.actionType] = row.configuration as any;
  });

  return {
    actionsSchema,
    actionConfiguration,
    systemPrompt,
  };
}

/**
 * Las funciones directas aveces requieren llamadas agenticas (generaciones internas).
 * @param source origen de la petición, el nombre de la función desde la que llama este agente.
 * @returns Todos los datos en conjunto de una acción, ej. prompt, configuration, json schema response.
 */
function getAgenticData(source: string) {
  return agenticHandler[source];
}

/*
openai/gpt-4.1-mini
openai/gpt-4o-mini
moonshotai/kimi-k2:free
qwen/qwen3-235b-a22b-2507:free
 */
const defaultModels = [
  "z-ai/glm-4.5-air:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "openai/gpt-4.1-nano",
  //"qwen/qwen3-coder:free",
];
export async function newGeneration<TAgentContext>({
  stateHelpers,
  env,
  body,
  models = defaultModels,
}: ChatCompletionProps<TAgentContext>): Promise<ServiceResponse<any, any>> {
  const {
    connectionType,
    isInternal,
    source,
    userData,
    subscriptions,
    message,
    timestamp,
    from,
    to,
  } = body;
  let actionsSchema: Tool[] = [];
  let conversationContext: Message[] = [];
  let actionConfiguration: ActionsConfiguration = {};
  let systemPrompt: string = "";
  let responseFormat: ResponseFormat = undefined;
  const userMessageTimestamp = timestamp;

  const { state, sql } = stateHelpers;

  /**
   * Si el tipo de conexión es "organizacional" se obtiene el id del asistente.
   * Si el tipo de conexión es "directa" esta conectado al asistente de impretion por lo que no hay un ID.
   * Una conexión organizacional siempre tiene un asistente suscrito asegurado, asi que utilizamos "!".
   */
  const assistantId =
    connectionType === "organizational"
      ? subscriptions[0].assistantId!
      : "impretion";

  /**
   * connectionType -> organizational/direct
   * connectedWith -> Identificador de la conexión por ejemplo whatsapp es un número de telefono, instagram es un username, outlook es un email. Ej: +57314567892
   */
  const AIGatewayMetadata: AIGatewayMetadata = {
    connectionType,
    userData,
    assistantId,
    isInternal,
    source,
    from,
    to,
  };

  try {
    if (connectionType === "organizational") {
      /**
       * FALTA CACHEAR ESTO
       */
      // Esto debe obtenerse por medio del cache, no de la base de datos..
      const getAssistantResponse = await env.CORE_SERVICE.mainDatabaseHandler({
        type: "assistants",
        query: {
          method: "getAssistants",
          data: {
            id: assistantId,
            withLinkedActions: true,
            withLinkedCollections: true,
            withPersonalities: true,
          },
        },
        userData,
      });

      if (!getAssistantResponse.success) {
        return {
          success: false,
          error: "Error al obtener los datos del asistente.",
        };
      }
      const getAssistant = getAssistantResponse.data as GetAssistantsResponse;

      // Obtencion de colecciones y acciones del asistente ejecutandose en esta generación.
      const organizationalData = await mapOrganizationalData(
        getAssistant,
        userData.organizationId,
        source,
        env,
      );

      actionsSchema = organizationalData.actionsSchema;
      actionConfiguration = organizationalData.actionConfiguration;
      systemPrompt = organizationalData.systemPrompt;
    } else if (connectionType === "direct") {
      // Usar configuración directa
      const directData = getDirectConnectionData();
      actionsSchema = directData.actionsSchema;
      actionConfiguration = directData.actionConfiguration;
      systemPrompt = directData.systemPrompt;
    } else if (connectionType === "agentic") {
      const agenticData = getAgenticData(source);

      actionsSchema = agenticData.actionsSchema;
      actionConfiguration = agenticData.actionConfiguration;
      systemPrompt = agenticData.systemPrompt;
      responseFormat = agenticData.actionJsonResponse;
    } else {
      return {
        success: false,
        error: "Tipo de conexión no válido.",
      };
    }

    // Construir el contexto de conversación
    conversationContext = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...(Array.isArray(state.lastConversationMessages)
        ? (state.lastConversationMessages as Message[])
        : []),
      { role: "user", content: message },
    ];

    console.log("conversationContext => ", conversationContext);
  } catch (error) {
    console.error("Error al obtener los datos de configuración:", error);
    return {
      success: false,
      error: "Error al obtener la configuración del asistente.",
    };
  }

  /**
   * Implementación de manejo de templates inteligentes para Whatsapp.
   * Los asistentes deben hacer interactuar al usuario para que la interacción sea correcta y no solo una IA automatizada.
   * organizational: Debe mostrarle al usuario las acciones que tiene si el usuario las pide, ser dinamico en sus respuestas. Lo más interactivo posible.
   * direct: Al terminar la ejecución de alguna acción sugerirle que puede ayudarle con algo más (calcular usaurio registrados por ej.).
   * responseFormat: Se encargara de, según la inferencia retornar un template si es necesario.
   */
  if (source === "whatsapp") {
  }

  console.log(
    "props a openrouter => ",
    conversationContext,
    models,
    responseFormat,
    actionsSchema,
    AIGatewayMetadata,
  );

  const completion: OpenRouterResponse = await openRouter({
    env,
    messages: conversationContext,
    models,
    responseFormat,
    tools: actionsSchema,
    stream: false,
    AIGatewayMetadata,
  });

  // Modelo especifico usado para esta generacion.
  const usedModel = completion.model;

  if (completion.choices[0].error || completion.error?.metadata) {
    return {
      success: false,
      error: "Error en el procesamiento de los datos.",
    };
  }

  const choice = completion.choices[0];
  const assistantMessageTimestamp = new Date();

  if ("message" in choice) {
    const assistantMessage = choice.message;

    // Manejo de tool calls
    if (assistantMessage.tool_calls?.length) {
      const toolMessages: Message[] = [];
      const baseAssistantMessage: Message = {
        role: "assistant",
        content: null,
        tool_calls: [],
      };
      let type;
      let data: string | Record<string, any> = "";
      let category;
      let responseMetadata = {};
      let hasTemplate = false;

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type === "function") {
          console.log("toolcall: ", toolCall.function);
          const parsedArgs = JSON.parse(toolCall.function.arguments);

          const functionResponse = await functionCalling<TAgentContext>({
            stateHelpers,
            functionType: toolCall.function.name,
            functionArguments: parsedArgs,
            assistantId,
            actionConfiguration,
            userData,
            from,
            to,
            env,
          });

          if (functionResponse.withTemplate) {
            type = functionResponse.data.type;
            data = functionResponse.data.response;
            category = functionResponse.data.category;
            responseMetadata = functionResponse.responseMetadata;
          } else {
            type = "commonMessage";
            data = functionResponse.data.response;
            category = "default";
            responseMetadata = {};
            baseAssistantMessage.tool_calls?.push({
              id: toolCall.id,
              type: toolCall.type,
              function: toolCall.function,
            });

            toolMessages.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: toolCall.function.name,
              content: functionResponse.data.response,
            });
          }
          hasTemplate = functionResponse.withTemplate;
        }
      }

      // Si no tiene template requiere refinar el texto retornado por la acción por otro agende de IA.
      if (!hasTemplate) {
        // Crear contexto completo para la segunda llamada
        const toolCallContext = [
          ...conversationContext,
          baseAssistantMessage,
          ...toolMessages,
        ];

        const toolCompletion: OpenRouterResponse = await openRouter({
          env,
          messages: toolCallContext,
          models,
          AIGatewayMetadata,
        });

        if (toolCompletion.choices[0].error || toolCompletion.error?.metadata) {
          return {
            success: false,
            error: "Error en el procesamiento de los datos.",
          };
        }

        const toolChoice = toolCompletion.choices[0];
        if ("message" in toolChoice && toolChoice.message.content) {
          data = toolChoice.message.content;
        }
      }

      return responseBuilder<TAgentContext>({
        sql,
        userData,
        stateHelpers,
        channelPayload: {
          responseMetadata,
          category: category as "default" | "appointments",
          data,
          type: type as string,
          connectionType,
        },
        messages: {
          userMessage: message,
          assistantMessage: data,
        },
        timestamps: {
          userMessageTimestamp,
          assistantMessageTimestamp,
        },
        model: usedModel,
        source,
        from,
        to,
        env,
      });
    }

    // Respuesta directa sin tool calls
    if (assistantMessage.content) {
      return responseBuilder<TAgentContext>({
        sql,
        userData,
        stateHelpers,
        channelPayload: {
          responseMetadata: {},
          category: "default",
          data: assistantMessage.content,
          type: "commonMessage",
          connectionType,
        },
        messages: {
          userMessage: message,
          assistantMessage: assistantMessage.content,
        },
        timestamps: {
          userMessageTimestamp,
          assistantMessageTimestamp,
        },
        model: usedModel,
        source,
        from,
        to,
        env,
      });
    }
  }

  return {
    success: false,
    error: "Error obteniendo una respuesta del asistente.",
  };
}
