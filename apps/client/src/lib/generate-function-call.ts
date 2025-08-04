// Tipos TypeScript correctos
interface ParameterProperty {
  type: string;
  description: string;
  enum?: string[];
}

interface ParametersSchema {
  type?: string;
  properties?: Record<string, ParameterProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

interface InputSchema {
  name: string;
  description?: string;
  parameters?: ParametersSchema;
  strict?: boolean;
}

interface FunctionCallParameters {
  type: string;
  properties: Record<string, ParameterProperty>;
  additionalProperties: boolean;
  required?: string[];
}

interface FunctionCallResult {
  name: string;
  description: string;
  strict: boolean;
  parameters: FunctionCallParameters;
}

/**
 * Genera dinámicamente una estructura de function call para IA
 * @param schema - El esquema del objeto con name, description, parameters, strict
 * @returns La estructura formateada para function call
 */
export function generateFunctionCall(schema: InputSchema): FunctionCallResult {
  const { name, description = "", parameters, strict = false } = schema;

  // Extraer properties de forma segura
  const properties: ParameterProperty | {} = parameters || {};

  // Determinar required fields
  let required: string[] | undefined;
  if (strict && Object.keys(properties).length > 0) {
    required = Object.keys(properties);
  } else if (parameters?.required && parameters.required.length > 0) {
    required = parameters.required;
  }

  // Estructura de la function call
  const functionCall: FunctionCallResult = {
    name,
    description,
    strict,
    parameters: {
      type: "object",
      properties,
      additionalProperties: false,
      ...(required && { required }),
    },
  };

  return functionCall;
}
