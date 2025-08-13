import { ServiceConfig } from "types";
import calendlyLogo from "../../../../../assets/logos/calendly.svg";
import shopifyLogo from "../../../../../assets/logos/shopify.svg";

export const SERVICE_CONFIGS: Record<string, ServiceConfig> = {
  calendly: {
    id: "calendly",
    name: "calendly",
    displayName: "Calendly",
    logo: calendlyLogo,
    description: {
      connected: "Tu cuenta está sincronizada correctamente",
      disconnected:
        "Sincroniza tu calendario para gestionar citas automáticamente",
    },
    colors: {
      primary: "blue-500",
      secondary: "blue-600",
      accent: "blue-100",
      gradientFrom: "blue-500",
      gradientTo: "blue-600",
    },
    clientId: "J-Qyynk19kv4187pQhC39Z_OIXcT5Zdf6PAzLiQkmzM",
    authUrl: "https://auth.calendly.com/oauth/authorize",
    tokenUrl: "https://auth.calendly.com/oauth/token",
    authConfig: {
      type: "oauth2",
      method: "pkce",
      responseType: "code",
      codeChallenge: true,
      state: true,
    },
  },

  shopify: {
    id: "shopify",
    name: "shopify",
    displayName: "Shopify",
    logo: shopifyLogo,
    description: {
      connected: "Tu tienda está conectada exitosamente",
      disconnected:
        "Conecta tu tienda Shopify para gestionar productos y órdenes",
    },
    colors: {
      primary: "green-500",
      secondary: "green-600",
      accent: "green-100",
      gradientFrom: "green-500",
      gradientTo: "green-600",
    },
    additionalFields: [
      {
        id: "shopUrl",
        label: "URL de tu tienda",
        placeholder: "mi-tienda.myshopify.com",
        type: "text",
        required: true,
        validation: {
          pattern: "^[a-zA-Z0-9-]+\\.myshopify\\.com$",
          message:
            "Ingresa una URL válida de Shopify (ej: mi-tienda.myshopify.com)",
        },
        description: "La URL completa de tu tienda Shopify",
      },
    ],
    clientId: "9c610c6da9a1dd3dec93b7e12c65386e",
    scopes: ["read_products", "write_products", "read_orders"],
    authConfig: {
      type: "oauth2",
      method: "hmac",
      responseType: "code",
      codeChallenge: false,
      state: true,
    },
  },

  google_calendar: {
    id: "google_calendar",
    name: "google_calendar",
    displayName: "Google Calendar",
    logo: "https://developers.google.com/identity/images/g-logo.png",
    description: {
      connected: "Tu Google Calendar está sincronizado",
      disconnected: "Conecta tu Google Calendar para sincronizar eventos",
    },
    colors: {
      primary: "red-500",
      secondary: "red-600",
      accent: "red-100",
      gradientFrom: "red-500",
      gradientTo: "red-600",
    },
    clientId: "",
    authUrl: "https://accounts.google.com/oauth2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    authConfig: {
      type: "oauth2",
      method: "pkce",
      responseType: "code",
      codeChallenge: true,
      state: true,
      customParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  },

  vtex: {
    id: "vtex",
    name: "vtex",
    displayName: "VTEX",
    logo: "https://assets.vtex.com/brand/favicon/favicon-32x32.png",
    description: {
      connected: "Tu cuenta VTEX está conectada",
      disconnected: "Conecta tu tienda VTEX para gestionar el catálogo",
    },
    colors: {
      primary: "purple-500",
      secondary: "purple-600",
      accent: "purple-100",
      gradientFrom: "purple-500",
      gradientTo: "purple-600",
    },
    additionalFields: [
      {
        id: "accountName",
        label: "Nombre de la cuenta",
        placeholder: "mi-cuenta",
        type: "text",
        required: true,
        validation: {
          pattern: "^[a-zA-Z0-9-]+$",
          message: "Solo se permiten letras, números y guiones",
        },
        description: "El nombre de tu cuenta VTEX",
      },
      {
        id: "environment",
        label: "Ambiente",
        placeholder: "Selecciona el ambiente",
        type: "select",
        required: true,
        options: [
          { value: "stable", label: "Stable" },
          { value: "beta", label: "Beta" },
        ],
        description: "Ambiente de tu tienda VTEX",
      },
      {
        id: "appKey",
        label: "App Key",
        placeholder: "Tu VTEX App Key",
        type: "text",
        required: true,
        description: "App Key de tu aplicación VTEX",
      },
      {
        id: "appToken",
        label: "App Token",
        placeholder: "Tu VTEX App Token",
        type: "text",
        required: true,
        description: "App Token de tu aplicación VTEX",
      },
    ],
    authConfig: {
      type: "custom",
      method: "client_secret",
      responseType: "code",
      codeChallenge: false,
      state: false,
    },
    scopes: ["read_products", "read_orders"],
  },
};

// Función helper para obtener configuración del servicio
export const getServiceConfig = (serviceName: string): ServiceConfig | null => {
  return SERVICE_CONFIGS[serviceName] || null;
};

// Función para generar URL de autorización según el servicio
export const generateAuthUrl = (
  service: ServiceConfig,
  params: {
    redirectUri: string;
    state?: string;
    codeChallenge?: string;
    additionalParams?: Record<string, string>;
  },
): string => {
  const { redirectUri, state, codeChallenge, additionalParams = {} } = params;

  const baseParams: Record<string, string> = {
    client_id: service.clientId || "",
    response_type: service.authConfig.responseType,
    redirect_uri: redirectUri,
  };

  console.log("parametros completos en generateAuthUrl: ", params);

  // Agregar scopes si existen en la url de autenticación de shopify, ya que asi lo requiere.
  if (service.scopes && service.scopes.length > 0) {
    // formato específico para Shopify (usa comas)
    if (service.name === "shopify") {
      baseParams.scope = service.scopes.join(",");
    } else {
      baseParams.scope = service.scopes.join(" ");
    }
  }

  // Agregar state si es requerido
  if (service.authConfig.state && state) {
    baseParams.state = state;
  }

  // Agregar PKCE si es requerido
  if (service.authConfig.codeChallenge && codeChallenge) {
    baseParams.code_challenge = codeChallenge;
    baseParams.code_challenge_method = "S256";
  }

  // Agregar parámetros personalizados del servicio
  if (service.authConfig.customParams) {
    Object.assign(baseParams, service.authConfig.customParams);
  }

  // Agregar parámetros adicionales específicos (ej: shop para Shopify)
  Object.assign(baseParams, additionalParams);

  // Construir URL final
  let authUrl = service.authUrl || "";

  // Para Shopify, la URL base cambia según la tienda
  if (service.name === "shopify" && additionalParams.shop) {
    authUrl = `https://${additionalParams.shop}/admin/oauth/authorize`;
  }

  const searchParams = new URLSearchParams(baseParams);
  return `${authUrl}?${searchParams.toString()}`;
};

/**
 * Realiza las validaciones específicas necesarias para cada servicio antes de que el callback envíe los datos a la ventana principal.
 * Por ejemplo, para Shopify, verifica que el hmac y el shop estén presentes.
 */
export const validateCallbackParams = (
  service: ServiceConfig,
  params: Record<string, string>,
): { isValid: boolean; error?: string } => {
  // Validaciones comunes
  if (params.error) {
    return {
      isValid: false,
      error:
        params.error_description || params.error || "Error de autorización",
    };
  }

  if (!params.code) {
    return {
      isValid: false,
      error: "No se recibió código de autorización",
    };
  }

  // Validaciones específicas por servicio
  if (service.name === "shopify") {
    if (!params.hmac) {
      return {
        isValid: false,
        error: "Falta validación HMAC de Shopify",
      };
    }

    if (!params.shop) {
      return {
        isValid: false,
        error: "Falta parámetro de tienda de Shopify",
      };
    }
  }

  return { isValid: true };
};
