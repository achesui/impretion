import { createFileRoute } from "@tanstack/react-router";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { z } from "zod";
import {
  getServiceConfig,
  validateCallbackParams,
} from "../(console)/connections/integrations/-configuration/services";

// El esquema Zod sigue siendo útil para parsear todos los posibles parámetros
const authSearchSchema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
  state: z.string().optional(),
  hmac: z.string().optional(),
  timestamp: z.coerce.string().optional(),
  shop: z.string().optional(),
  scope: z.string().optional(),
  authuser: z.string().optional(),
  prompt: z.string().optional(),
});

export const Route = createFileRoute("/(oauth)/auth")({
  validateSearch: authSearchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const searchParams = Route.useSearch();
  const processedRef = useRef<boolean>(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const handleAuthCallback = async () => {
      console.log("📥 Parámetros recibidos:", searchParams);

      if (!window.opener) {
        console.error("❌ Error crítico: No hay referencia a window.opener");
        // setTimeout(() => window.close(), 3000);
        return;
      }

      // ¡CAMBIO CLAVE! Toda la lógica ahora depende del 'state'
      const { state: encodedState, ...otherParams } = searchParams;

      let serviceName: string | undefined;
      let parentOrigin: string | undefined;

      if (!encodedState) {
        console.error(
          "❌ Error Crítico: No se recibió el parámetro 'state'. La solicitud no puede ser verificada.",
        );
        window.opener.postMessage(
          { type: "AUTH_ERROR", error: "Missing state parameter" },
          "*",
        );
        //window.close();
        return;
      }

      try {
        const decodedState = JSON.parse(atob(encodedState));
        console.log("🔍 Estado decodificado:", decodedState);

        serviceName = decodedState.service;
        parentOrigin = decodedState.origin;

        if (!serviceName || !parentOrigin) {
          throw new Error(
            "El objeto 'state' decodificado es inválido. Faltan 'service' u 'origin'.",
          );
        }
      } catch (e) {
        console.error(
          "❌ Error Crítico: Falló la decodificación del parámetro 'state'. Solicitud posiblemente maliciosa.",
          e,
        );
        window.opener.postMessage(
          { type: "AUTH_ERROR", error: "Invalid state parameter" },
          "*",
        );
        //window.close();
        return;
      }

      // ¡CAMBIO CLAVE! Se ha eliminado la lógica de detección/inferencia de servicio.
      // Ahora confiamos únicamente en los datos del 'state'.

      // Validar si el origen es seguro
      const isValidOrigin = (origin: string): boolean => {
        const allowedOrigins = [
          /^http:\/\/localhost:\d+$/,
          /^https:\/\/.*\.ngrok-free\.app$/,
          /^https:\/\/.*\.vercel\.app$/,
          /^https:\/\/.*\.netlify\.app$/,
          // Agrega dominios de producción aquí
        ];
        return allowedOrigins.some((pattern) => pattern.test(origin));
      };

      if (!isValidOrigin(parentOrigin)) {
        console.error(
          "🚨 Error de seguridad: El 'origin' del state no es válido.",
          parentOrigin,
        );
        //window.close();
        return;
      }

      // Obtener configuración del servicio
      const serviceConfig = getServiceConfig(serviceName);

      if (!serviceConfig) {
        console.error("❌ Error: Servicio no configurado:", serviceName);
        window.opener.postMessage(
          {
            type: "AUTH_ERROR",
            error: `Servicio '${serviceName}' no configurado`,
            service: serviceName,
          },
          parentOrigin,
        );
        //window.close();
        return;
      }

      // Validar parámetros de callback según el servicio
      const validation = validateCallbackParams(
        serviceConfig,
        otherParams as Record<string, string>,
      );

      if (!validation.isValid) {
        console.error(
          "❌ Error de validación de parámetros:",
          validation.error,
        );
        window.opener.postMessage(
          {
            type: "AUTH_ERROR",
            error: validation.error,
            service: serviceName,
          },
          parentOrigin,
        );
        //window.close();
        return;
      }

      try {
        console.log("✅ Enviando datos de éxito a la ventana principal...");

        const responseData: any = {
          type: "AUTH_SUCCESS",
          code: otherParams.code,
          service: serviceName,
          state: encodedState,
          ...otherParams, // Enviamos todos los demás parámetros por si el handler principal los necesita
        };

        console.log("params a enviar: ", responseData);

        window.opener.postMessage(responseData, parentOrigin);
      } catch (commError) {
        console.error(
          "❌ Falló la comunicación con la ventana principal:",
          commError,
        );
        // La ventana principal podría haberse cerrado, intentamos notificar con origin '*' como último recurso.
        window.opener.postMessage(
          {
            type: "AUTH_ERROR",
            error: "Error de comunicación con la ventana principal",
            service: serviceName,
          },
          parentOrigin || "*",
        );
      }

      setTimeout(() => {
        console.log("🔒 Cerrando ventana de autenticación...");
        // window.close();
      }, 1500);
    };

    handleAuthCallback();
  }, [searchParams]);

  // Las funciones de UI pueden simplificarse un poco
  const getServiceInfo = () => {
    try {
      if (searchParams.state) {
        const decodedState = JSON.parse(atob(searchParams.state));
        if (decodedState.service) {
          const config = getServiceConfig(decodedState.service);
          return {
            displayName: config?.displayName || "servicio desconocido",
            color: config?.colors.primary || "blue-500",
          };
        }
      }
    } catch {
      /* Ignorar errores de parseo aquí, la lógica principal ya los maneja */
    }

    // Fallback por si el state aún no se ha procesado
    return {
      displayName: "el servicio",
      color: "blue-500",
    };
  };

  const { displayName, color } = getServiceInfo();

  // Determinar el estado de la autenticación
  const getAuthStatus = () => {
    if (searchParams.error) {
      return {
        type: "error",
        message:
          searchParams.error_description ||
          searchParams.error ||
          "Error de autorización",
        icon: <AlertTriangle className="w-8 h-8 text-red-500" />,
      };
    }
    if (searchParams.code) {
      return {
        type: "success",
        message: `Autenticación exitosa con ${displayName}`,
        icon: <CheckCircle className="w-8 h-8 text-green-500" />,
      };
    }
    return {
      type: "processing",
      message: `Procesando autenticación con ${displayName}...`,
      icon: <Loader2 className={`w-8 h-8 text-${color} animate-spin`} />,
    };
  };

  const authStatus = getAuthStatus();

  return (
    <div className="flex items-center justify-center h-dvh bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4 text-center">
        <div className="flex justify-center mb-6">{authStatus.icon}</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">
          {authStatus.type === "error"
            ? "Error de Autenticación"
            : authStatus.type === "success"
              ? "Autenticación Exitosa"
              : "Procesando Autenticación"}
        </h2>
        <p
          className={`text-sm mb-4 ${authStatus.type === "error" ? "text-red-600" : authStatus.type === "success" ? "text-green-600" : "text-gray-600"}`}
        >
          {authStatus.message}
        </p>
        <p className="text-xs text-gray-400">
          Esta ventana se cerrará automáticamente
        </p>
        {import.meta.env.DEV && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-left">
            <p className="font-semibold mb-2 text-gray-700">Debug Info:</p>
            <pre className="text-gray-600 text-xs break-all whitespace-pre-wrap">
              {JSON.stringify(searchParams, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
