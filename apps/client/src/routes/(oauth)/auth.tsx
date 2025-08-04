import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { z } from "zod";

// Define un esquema de validación para los parámetros de búsqueda de la URL.
const authSearchSchema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
  state: z.string().optional(), // El 'state' contiene el origen de la ventana padre
});

export const Route = createFileRoute("/(oauth)/auth")({
  validateSearch: authSearchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const searchParams = Route.useSearch();

  const { code, error, error_description, state: parentOrigin } = searchParams;
  const processedRef = useRef<boolean>(false);

  useEffect(() => {
    // Prevenir múltiples ejecuciones
    if (processedRef.current) {
      return;
    }

    processedRef.current = true;

    const isValidOrigin = (origin: string): boolean => {
      const allowedOrigins = [
        /^http:\/\/localhost:\d+$/,
        /^https:\/\/.*\.ngrok-free\.app$/,
        /^https:\/\/.*\.vercel\.app$/,
        /^https:\/\/.*\.netlify\.app$/,
        // Agrega tu dominio de producción aquí
      ];
      return allowedOrigins.some((pattern) => pattern.test(origin));
    };

    // Verificar si tenemos window.opener
    if (!window.opener) {
      console.error("Error crítico: No hay referencia a window.opener");
      console.log("Esto puede suceder si:");
      console.log("1. La página se abrió directamente (no desde popup)");
      console.log("2. El popup perdió la referencia al padre");
      console.log("3. Hay problemas de CORS o seguridad");

      // Intentar cerrar la ventana de todos modos
      setTimeout(() => {
        window.close();
      }, 3000);
      return;
    }

    // Validar el origen del state
    if (!parentOrigin) {
      console.error("Error: No se recibió el parámetro 'state' con el origen");
      window.opener.postMessage(
        {
          type: "AUTH_ERROR",
          error: "Missing state parameter",
        },
        "*"
      ); // Usar * como fallback
      window.close();
      return;
    }

    if (!isValidOrigin(parentOrigin)) {
      console.error(
        "Error de seguridad: El 'state' (origen) no es válido.",
        parentOrigin
      );
      window.close();
      return;
    }

    try {
      if (error) {
        console.log("Enviando mensaje de error a la ventana principal...");
        const errorMessage =
          error_description || error || "Error de autorización";
        window.opener.postMessage(
          {
            type: "AUTH_ERROR",
            error: errorMessage,
          },
          parentOrigin
        );
      } else if (code) {
        console.log("Enviando código de éxito a la ventana principal...");
        window.opener.postMessage(
          {
            type: "AUTH_SUCCESS",
            code: code,
          },
          parentOrigin
        );
      } else {
        console.log(
          "No se recibió código ni error - parámetros:",
          searchParams
        );
        window.opener.postMessage(
          {
            type: "AUTH_ERROR",
            error: "No se recibió código de autorización",
          },
          parentOrigin
        );
      }
    } catch (commError) {
      console.error(
        "Falló la comunicación con la ventana principal:",
        commError
      );
    }

    // Cerrar la ventana después de un breve delay
    setTimeout(() => {
      console.log("Cerrando ventana de autenticación...");
      window.close();
    }, 1000);
  }, [code, error, error_description, parentOrigin]);

  return (
    <div className="flex items-center justify-center h-dvh gap-2 flex-col">
      <Loader2 className="animate-spin text-slate-500" size={32} />
      <p className="text-slate-500 text-center max-w-md">
        Procesando autenticación con Calendly...
      </p>
      <p className="text-xs text-slate-400 text-center">
        Esta ventana se cerrará automáticamente
      </p>

      {/* Debug info - solo en desarrollo */}
      {import.meta.env.DEV && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg text-xs">
          <p>
            <strong>Debug Info:</strong>
          </p>
          <p>Code: {code ? "Received ✓" : "Not received ✗"}</p>
          <p>Error: {error || "None"}</p>
          <p>State: {parentOrigin || "Not provided"}</p>
          <p>URL: {window.location.href}</p>
        </div>
      )}
    </div>
  );
}
