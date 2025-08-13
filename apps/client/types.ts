import { ReactNode } from "@tanstack/react-router";
import {
  AssistantUpdatePromptSchema,
  CreateOrDeleteAssistantLinkedActionSchema,
  InsertCollectionContentSchema,
} from "../core-service/postgres-database/controller/validations";

export type QueryDatabaseSchema = {
  type: string;
  query: {
    data: Record<string, any> | string | number;
    method: string;
  };
  userData: { organizationId: string; userId?: string };
};

export type DatabaseCacheSchema = {
  type: "getCache";
  data: {
    organizationId: string;
    segments: {
      entity: string;
      identifier?: string;
    }[];
  };
  withMetadata: boolean;
};

export type QueryGeneralSchema = {
  workerUrl: string;
  route: string;
  data: Record<string, any>;
};

// ========== COLLECTIONS ==========
// Para la inserción optimizta de los datos al crear una nueva colección
export type UpsertCollectionMutation = {
  type: string;
  query: {
    data:
      | {
          operation: "create";
          values: { name: string; description: string };
        }
      | {
          operation: "update";
          id: string;
          values: {
            description: string;
            name: string;
          };
        };
    method: string;
  };
  userData: { organizationId: string; userId?: string };
};

export type CollectionContentMutationSchema = {
  type: "knowledgeBase";
  query: {
    method: "createOrDeleteCollectionContent";
    data:
      | {
          operation: "create";
          values: InsertCollectionContentSchema;
        }
      | {
          operation: "delete";
          id: string;
        };
  };
  userData: {
    organizationId: string;
  };
};

// ========== ASSISTANTS ==========
// Para la inserción optimizta de los datos al actualizar un asistente.
export type UpdateAssistantPromptMutationSchema = {
  type: "assistants";
  query: {
    method: "updateAssistantPrompt";
    data: AssistantUpdatePromptSchema;
  };
  userData: {
    organizationId: string;
    userId?: string;
  };
};

export type CreateOrDeleteAssistantLinkedAction = {
  type: "assistants";
  query: {
    method: "updateAssistantActions";
    data: CreateOrDeleteAssistantLinkedActionSchema;
  };
  userData: {
    organizationId: string;
    userId?: string;
  };
};

// ========== ACTIONS ==========
export type ActionType = "appointment";

export type ActionSchema = {
  renderer: {
    metadata: {
      functionCalling: {
        name: string;
        description: string;
        parameters: Record<string, any>;
        extraParameters: Record<string, any> | null;
      };
      definitions: {
        type: string;
        description: string;
        route: string;
        newActionButton: string;
        icon: ReactNode;
      };
    };
    filters: {};
    configuration: Record<
      string,
      {
        label: string;
        description: string;
        component: string;
        optional: boolean;
        examples?: string[];
        defaultValues: {
          id: number;
          value: string | number | {};
        };
      }
    >;
    parameters: Record<
      string,
      { label: string; description: string; optional: boolean }
    >;
  };
  defaultContext: {
    configuration: string[];
    parameters: string[];
  };
  actionConfiguration: {
    usage: {
      commercial: number;
    };
  };
};

//========== INTEGRATIONS ==========
export interface ServiceConfig {
  id: string;
  name: string;
  displayName: string;
  logo: string;
  description: {
    connected: string;
    disconnected: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    gradientFrom: string;
    gradientTo: string;
  };
  clientId?: string;
  authUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  additionalFields?: AdditionalField[];
  metadata?: Record<string, any>;
  // Configuración específica para cada servicio
  authConfig: {
    type: "oauth2" | "custom"; // Tipo de autenticación
    method: "pkce" | "client_secret" | "hmac"; // Método de seguridad
    responseType: "code" | "token"; // Tipo de respuesta
    codeChallenge?: boolean; // Si requiere PKCE
    state?: boolean; // Si requiere parámetro state
    customParams?: Record<string, string>; // Parámetros adicionales para la URL de autorización
  };
}

export interface AdditionalField {
  id: string;
  label: string;
  placeholder: string;
  type: "text" | "email" | "url" | "select" | "textarea";
  required: boolean;
  validation?: {
    pattern?: string;
    message?: string;
  };
  options?: { value: string; label: string }[];
  description?: string;
}

export interface IntegrationFormData {
  [key: string]: string | number | boolean;
}

export interface AuthCallbackParams {
  code?: string;
  error?: string;
  error_description?: string;
  state?: string;
  // Parámetros específicos de Shopify
  hmac?: string;
  timestamp?: string;
  shop?: string;
  // Parámetros adicionales que puedan venir de otros servicios
  [key: string]: string | undefined;
}

export interface AuthUrlParams {
  clientId: string;
  redirectUri: string;
  scopes?: string[];
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  // Parámetros específicos por servicio
  [key: string]: any;
}
