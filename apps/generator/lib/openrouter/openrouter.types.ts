// openrouter.types.ts
export type ResponseFormat =
  | { type: "json_schema"; json_schema: Record<string, any> }
  | { type: "json_object" }
  | undefined;

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContentPart = {
  type: "image_url";
  image_url: {
    url: string; // URL or base64 encoded image data
    detail?: string; // Optional, defaults to "auto"
  };
};

export type ContentPart = TextContent | ImageContentPart;

export type Message =
  | {
      role: "user" | "system";
      // ContentParts are only for the "user" role:
      content: string | ContentPart[];
      // If "name" is included, it will be prepended like this
      // for non-OpenAI models: `{name}: {content}`
      name?: string;
    }
  | {
      role: "tool";
      content: string;
      tool_call_id: string;
      name?: string;
    }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: {
        id: string;
        type: string;
        function: { name: string; arguments: string };
      }[]; // Optional and can be an empty array
    };

export type FunctionDescription = {
  description?: string;
  name: string;
  parameters: object; // JSON Schema object
};

export type Tool = {
  type: "function";
  function: FunctionDescription;
};

export type ToolChoice =
  | "none"
  | "auto"
  | {
      type: "function";
      function: {
        name: string;
      };
    };

export type ProviderPreferences = {
  allow_fallbacks?: boolean | null;
  require_parameters?: boolean | null;
  data_collection?: "deny" | "allow" | null;
  order?:
    | (
        | "OpenAI"
        | "Anthropic"
        | "Google"
        | "Google AI Studio"
        | "Amazon Bedrock"
        | "Groq"
        | "SambaNova"
        | "Cohere"
        | "Mistral"
        | "Together"
        | "Together 2"
        | "Fireworks"
        | "DeepInfra"
        | "Lepton"
        | "Novita"
        | "Avian"
        | "Lambda"
        | "Azure"
        | "Modal"
        | "AnyScale"
        | "Replicate"
        | "Perplexity"
        | "Recursal"
        | "OctoAI"
        | "DeepSeek"
        | "Infermatic"
        | "AI21"
        | "Featherless"
        | "Inflection"
        | "xAI"
        | "Cloudflare"
        | "SF Compute"
        | "Minimax"
        | "01.AI"
        | "HuggingFace"
        | "Mancer"
        | "Mancer 2"
        | "Hyperbolic"
        | "Hyperbolic 2"
        | "Lynn 2"
        | "Lynn"
        | "Reflection"
      )[]
    | null;
  ignore?:
    | (
        | "OpenAI"
        | "Anthropic"
        | "Google"
        | "Google AI Studio"
        | "Amazon Bedrock"
        | "Groq"
        | "SambaNova"
        | "Cohere"
        | "Mistral"
        | "Together"
        | "Together 2"
        | "Fireworks"
        | "DeepInfra"
        | "Lepton"
        | "Novita"
        | "Avian"
        | "Lambda"
        | "Azure"
        | "Modal"
        | "AnyScale"
        | "Replicate"
        | "Perplexity"
        | "Recursal"
        | "OctoAI"
        | "DeepSeek"
        | "Infermatic"
        | "AI21"
        | "Featherless"
        | "Inflection"
        | "xAI"
        | "Cloudflare"
        | "SF Compute"
        | "Minimax"
        | "01.AI"
        | "HuggingFace"
        | "Mancer"
        | "Mancer 2"
        | "Hyperbolic"
        | "Hyperbolic 2"
        | "Lynn 2"
        | "Lynn"
        | "Reflection"
      )[]
    | null;
  quantizations?:
    | ("int4" | "int8" | "fp6" | "fp8" | "fp16" | "bf16" | "unknown")[]
    | null;
};

export type OpenRouterRequest = {
  // Either "messages" or "prompt" is required
  messages?: Message[];
  prompt?: string;

  // If "model" is unspecified, uses the user's default
  model?: string; // See "Supported Models" section

  // Allows to force the model to produce specific output format.
  // See models page and note on this docs page for which models support it.
  response_format?:
    | { type: "json_schema"; json_schema: {} }
    | { type: "json_object" }
    | undefined;

  stop?: string | string[];
  stream?: boolean; // Enable streaming

  // See LLM Parameters (openrouter.ai/docs/parameters)
  max_tokens?: number; // Range: [1, context_length)
  temperature?: number; // Range: [0, 2]

  // Tool calling
  // Will be passed down as-is for providers implementing OpenAI's interface.
  // For providers with custom interfaces, we transform and map the properties.
  // Otherwise, we transform the tools into a YAML template. The model responds with an assistant message.
  // See models supporting tool calling: openrouter.ai/models?supported_parameters=tools
  tools?: Tool[];
  tool_choice?: ToolChoice;

  // Advanced optional parameters
  seed?: number; // Integer only
  top_p?: number; // Range: (0, 1]
  top_k?: number; // Range: [1, Infinity) Not available for OpenAI models
  frequency_penalty?: number; // Range: [-2, 2]
  presence_penalty?: number; // Range: [-2, 2]
  repetition_penalty?: number; // Range: (0, 2]
  logit_bias?: { [key: number]: number };
  top_logprobs?: number; // Integer only
  min_p?: number; // Range: [0, 1]
  top_a?: number; // Range: [0, 1]

  // Reduce latency by providing the model with a predicted output
  // https://platform.openai.com/docs/guides/latency-optimization#use-predicted-outputs
  prediction?: { type: "content"; content: string };

  // OpenRouter-only parameters
  // See "Prompt Transforms" section: openrouter.ai/docs/transforms
  transforms?: string[];
  // See "Model Routing" section: openrouter.ai/docs/model-routing
  models?: string[];
  route?: "fallback";
  // See "Provider Routing" section: openrouter.ai/docs/provider-routing
  provider?: ProviderPreferences;
};

/* RESPONSE */

export type ResponseUsage = {
  /** Including images and tools if any */
  prompt_tokens: number;
  /** The tokens generated */
  completion_tokens: number;
  /** Sum of the above two fields */
  total_tokens: number;
};

export type ErrorResponse = {
  code: number; // See "Error Handling" section
  message: string;
  metadata?: Record<string, unknown>; // Contains additional error information such as provider details, the raw error message, etc.
};

export type ToolCall = {
  id: string;
  type: "function";
  function: any;
};

export type NonChatChoice = {
  finish_reason: string | null;
  text: string;
  error?: ErrorResponse;
};

export type NonStreamingChoice = {
  finish_reason: string | null; // Depends on the model. Ex: "stop" | "length" | "content_filter" | "tool_calls"
  message: {
    content: string | null;
    role: string;
    tool_calls?: ToolCall[];
  };
  error?: ErrorResponse;
};

export type StreamingChoice = {
  finish_reason: string | null;
  delta: {
    content: string | null;
    role?: string;
    tool_calls?: ToolCall[];
  };
  error?: ErrorResponse;
};

// Definitions of subtypes are below
export type OpenRouterResponse = {
  id: string;
  // Depending on whether you set "stream" to "true" and
  // whether you passed in "messages" or a "prompt", you
  // will get a different output shape
  choices: (NonStreamingChoice | StreamingChoice | NonChatChoice)[];
  created: number; // Unix timestamp
  model: string;
  object: "chat.completion" | "chat.completion.chunk";

  system_fingerprint?: string; // Only present if the provider supports it

  // Usage data is always returned for non-streaming.
  // When streaming, you will get one usage object at
  // the end accompanied by an empty choices array.
  usage?: ResponseUsage;
  error: ErrorResponse | null;
};
