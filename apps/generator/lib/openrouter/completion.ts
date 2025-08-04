import { AIGatewayMetadata } from "../../src/types";
import {
  OpenRouterResponse,
  OpenRouterRequest,
  Message,
  Tool,
} from "./openrouter.types"; // Importa todos los tipos necesarios

type OpenRouterProps = {
  env: Env;
  messages: Message[];
  models: string[];
  responseFormat?:
    | { type: "json_schema"; json_schema: Record<string, any> }
    | { type: "json_object" }
    | undefined;
  tools?: Tool[];
  stream?: boolean;
  AIGatewayMetadata: AIGatewayMetadata;
};

export const openRouter = async ({
  env,
  messages,
  models,
  responseFormat = undefined,
  tools,
  stream = false,
  AIGatewayMetadata,
}: OpenRouterProps): Promise<OpenRouterResponse> => {
  const requestBody: OpenRouterRequest = {
    messages,
    models,
    response_format: responseFormat,
    tools,
    stream,
  };

  const {
    connectionType,
    isInternal,
    assistantId,
    source,
    userData,
    from,
    to,
  } = AIGatewayMetadata;

  console.log(
    connectionType,
    isInternal,
    assistantId,
    source,
    from,
    to,
    userData.organizationId,
  );

  const aiGatewayId =
    env.ENVIRONMENT === "development" ? "logs-dev" : "logs-prod";

  const response = await fetch(
    `https://gateway.ai.cloudflare.com/v1/5ae9017fbb2c986a55c6b39962fcde89/${aiGatewayId}/openrouter/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "content-type": "application/json",
        "cf-aig-metadata": JSON.stringify({
          connectionType,
          isInternal,
          source,
          // Debido a problemas con la longitud de los metadatos, creamos grupos de objetos y los convertimos en strings.
          communicationPair: JSON.stringify({ from, to }),
          identifiers: JSON.stringify({
            assistantId,
            organizationId: userData.organizationId,
          }),
        }),
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    // Manejar errores de forma más específica
    const errorData = await response.json();
    console.error("Error en la respuesta de OpenRouter:", errorData);
    throw new Error(
      `OpenRouter API error: ${response.status} ${response.statusText}`,
    );
  }

  const data: OpenRouterResponse = await response.json();

  return data;
};
