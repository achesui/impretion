import { GetCollectionsResponse } from "@core-service/types";
import { FunctionCallingProps, RagArgs } from "../../../src/types";
import { newGeneration } from "../../../lib/generation-handler/new-generation";

export const rag = async <TAgentContext>({
  stateHelpers,
  functionArguments,
  userData,
  env,
  connection,
}: FunctionCallingProps<TAgentContext, RagArgs>): Promise<string | null> => {
  console.log("argumentos de funcion => ", functionArguments);
  const { collectionIds, optimizedQuery } = functionArguments;
  const { organizationId } = userData;

  const result = await env.AI.autorag("fancy-heart-9bff").search({
    query: optimizedQuery,
    rewrite_query: true,
    filters: {
      type: "or" as const,
      filters: collectionIds.map((collectionId) => ({
        type: "eq" as const,
        key: "folder" as const,
        value: `${organizationId}/${collectionId}/`,
      })),
    },
    max_num_results: 10,
  });

  console.log("FILTRO--------------> ", {
    type: "or" as const,
    filters: collectionIds.map((collectionId) => ({
      type: "eq" as const,
      key: "folder" as const,
      value: `${organizationId}/${collectionId}/`,
    })),
  });

  console.log("SOLO DATA DENTRO ARRAY -----> ", result.data[0]);
  console.log("DATA ÚNICAMENTE -----> ", result.data);
  console.log("respuesta entera -----> ", result.search_query);
  const { search_query: searchQuery } = result;

  const accomulatedRagResponse = result.data
    .reduce((acc, ragResponse) => {
      ragResponse.content.forEach((chunk) => {
        acc += (chunk.text || "") + "\n\n";
      });
      return acc;
    }, "")
    .trimEnd();

  const fullRagResponse = JSON.stringify(accomulatedRagResponse);

  const newRagQuery = `
  Pregunta del usuario:
  ${searchQuery}

  Respuesta RAG:
  ${fullRagResponse}
  `;

  const response = await newGeneration({
    stateHelpers,
    env,
    body: {
      connectionType: "agentic",
      message: newRagQuery,
      userData,
      subscribedToAssistant: "",
      isInternal: true,
      source: "rag",
    },
    connection,
  });

  if (!response.success) return "Hmm.., ha ocurrido un error";

  console.log("RESPUESTA DE DATOS ----> ", response.data);
  const { data } = response;

  return data;
};

export function RagTool(currentCollections: GetCollectionsResponse[]) {
  const collectionsDescription = currentCollections
    .map((collection) => `- ID: "${collection.id}" | ${collection.description}`)
    .join("\n\n");

  const collectionsId = currentCollections.map((collection) => collection.id);

  console.log("RYAN CASTRO -> ", collectionsId);

  return {
    name: "rag",
    strict: true,
    parameters: {
      type: "object",
      required: ["collectionIds", "optimizedQuery"],
      properties: {
        collectionIds: {
          type: "array",
          description:
            "MANDATORY: An array containing the EXACT IDs of ALL relevant collections for the ENTIRE user message. If the user asks about billing AND technical support AND product usage, include ALL three collection IDs in this single array. This ensures one comprehensive search across all relevant knowledge bases.",
          items: {
            type: "string",
            enum: collectionsId,
          },
          minItems: 1,
        },
        optimizedQuery: {
          type: "string",
          description:
            "MANDATORY: A single, comprehensive query that consolidates ALL user questions and topics into one unified search string. If the user asks multiple questions about different topics, merge them into one coherent query enriched with relevant keywords from ALL selected collections, separated by commas and logical operators. Example: If user asks about billing issues AND API documentation, create one query like 'billing subscription payment issues, and API documentation endpoints, troubleshooting integration'. Use commas to separate different topic areas within the consolidated query. Never split into separate queries.",
          minLength: 10,
        },
      },
      additionalProperties: false,
    },
    description: `MANDATORY single function call to search the knowledge base across multiple collections. This function MUST be called only ONCE per user message, regardless of how many different topics or questions the user asks. It identifies ALL relevant collections and consolidates ALL user queries into a single optimized search.
IMPORTANT: Never make multiple calls to this function. Always consolidate all user queries into one comprehensive search.
AVAILABLE COLLECTIONS:

${collectionsDescription}`,
  };
}

/**
 * PROMPT: Se encarga de resumir, formatear y reducir el ruido de lo retornado por el RAG.
 */
export function ragPrompt() {
  return `Eres un asistente experto que transforma respuestas técnicas de un sistema RAG en respuestas claras, útiles y conversacionales para el usuario final.

FORMATO DE ENTRADA:
---
Pregunta del usuario:
{la pregunta que hizo el usuario}

Respuesta RAG:
{resultado crudo del sistema de recuperación}
---

INSTRUCCIONES:
1. **Contexto**: Primero, comprende completamente la intención detrás de la pregunta del usuario.
2. **Síntesis inteligente**: Extrae solo la información relevante del texto RAG, ignorando redundancias o datos irrelevantes.
3. **Claridad**: Reorganiza la información en una estructura lógica usando:
   - Lenguaje natural y amigable
   - Párrafos cortos y directos
   - Viñetas o números si hay múltiples puntos
   - Ejemplos concretos cuando sea útil
4. **Profundidad adaptativa**: Si la respuesta RAG es muy técnica, simplifica sin perder precisión. Si es muy básica, añade contexto valioso.
5. **Respuesta completa**: Si la respuesta RAG no cubre completamente la pregunta, indica educadamente qué información falta.

FORMATO DE SALIDA:
Proporciona una respuesta bien estructurada que:
- Comience con una frase contextual como "Basándome en la información disponible..."
- Presente los puntos clave de manera clara
- Finalice con una conclusión útil o siguiente paso si aplica

Evita mencionar que la información viene de un "sistema RAG" - simplemente entrega la respuesta de forma natural.`;
}

/*
return {
    "name": "optimized_knowledge_search",
    "description": "MANDATORY single function call to search the knowledge base across multiple collections. This function MUST be called only ONCE per user message, regardless of how many different topics or questions the user asks. It identifies ALL relevant collections and consolidates ALL user queries into a single optimized search.\n\nIMPORTANT: Never make multiple calls to this function. Always consolidate all user queries into one comprehensive search.\n\nAVAILABLE COLLECTIONS:\n\n- ID: \"a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d\" | Colección de Facturación y Suscripciones: Es la fuente de verdad para todas las consultas sobre el aspecto financiero de la cuenta. Cubre temas como gestión de suscripciones, cambios de plan (upgrade/downgrade), actualización de métodos de pago, visualización y descarga de facturas, políticas de reembolso y detalles sobre periodos de prueba.\n\n- ID: \"f0e9d8c7-b6a5-4f3e-2d1c-ba0987654321\" | Colección de Soporte Técnico y API: El manual técnico completo para desarrolladores y usuarios avanzados. Contiene guías detalladas para la solución de problemas, códigos de error, guías de instalación y configuración de la plataforma 'Nexus Pro', documentación completa de la API (endpoints, rate limits, autenticación) e integración con herramientas de terceros.\n\n- ID: \"z9y8x7w6-v5u4-4t3s-2r1q-p0o9n8m7l6k5\" | Colección de Guías de Uso del Producto: El centro de aprendizaje para el día a día de los usuarios. Ofrece tutoriales y guías paso a paso sobre cómo utilizar las funcionalidades clave de nuestros productos, como la creación y gestión de proyectos, colaboración en equipo, invitación de nuevos miembros, generación de reportes personalizados y optimización de dashboards.",
    "strict": true,
    "parameters": {
        "type": "object",
        "required": [
            "collection_ids",
            "optimized_query"
        ],
        "properties": {
            "collection_ids": {
                "type": "array",
                "description": "MANDATORY: An array containing the EXACT IDs of ALL relevant collections for the ENTIRE user message. If the user asks about billing AND technical support AND product usage, include ALL three collection IDs in this single array. This ensures one comprehensive search across all relevant knowledge bases.",
                "items": {
                    "type": "string",
                    "enum": [
                        "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
                        "f0e9d8c7-b6a5-4f3e-2d1c-ba0987654321",
                        "z9y8x7w6-v5u4-4t3s-2r1q-p0o9n8m7l6k5"
                    ]
                },
                "minItems": 1
            },
            "optimized_query": {
                "type": "string",
                "description": "MANDATORY: A single, comprehensive query that consolidates ALL user questions and topics into one unified search string. If the user asks multiple questions about different topics, merge them into one coherent query enriched with relevant keywords from ALL selected collections, separated by commas and logical operators. Example: If user asks about billing issues AND API documentation, create one query like 'billing subscription payment issues, and API documentation endpoints, troubleshooting integration'. Use commas to separate different topic areas within the consolidated query. Never split into separate queries.",
                "minLength": 10
            }
        },
        "additionalProperties": false
    }
}

{
  "name": "rag",
  "description": "This is a rag system, this function should be ONLY CALLED when the user wants to know about these topics: Historia de Colombia",
  "strict": true,
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The user's search query to retrieve relevant information using RAG. This should be a enhanced version of the user's query."
      }
    },
    "required": [
      "query"
    ],
    "additionalProperties": false
  }
}
 */
