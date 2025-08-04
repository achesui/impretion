import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Check,
  X,
  Calendar,
  Info,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { generateCodeVerifier, generateCodeChallenge } from "@/lib/pkce";
import {
  useRemoveIntegrationMutation,
  useUpsertIntegrationMutation,
} from "@/services/queries";
import { Link } from "@tanstack/react-router";
import { GetUserDataResponse } from "@core-service/types";
import { UserData } from "@base/shared-types";
import calendlyLogo from "../../../../../assets/logos/calendly.svg";

const PKCE_VERIFIER_KEY = "pkce_code_verifier";
const CLIENT_ID = "J-Qyynk19kv4187pQhC39Z_OIXcT5Zdf6PAzLiQkmzM";
const SERVICE = "calendly";

interface CalendlyAuthProps {
  currentIntegration: GetUserDataResponse["integrations"];
  userData: UserData;
}

export default function CalendlyAuth({
  currentIntegration,
  userData,
}: CalendlyAuthProps) {
  const { organizationId, userId } = userData;

  // Estados principales
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // Empieza en true
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [integrationId, setIntegrationId] = useState<string | null>(
    currentIntegration?.[0]?.id ?? null
  );
  const [connectedEmail, setConnectedEmail] = useState<string | null>(
    currentIntegration?.[0]?.connectedEmail ?? null
  );

  // Referencias para cleanup y control
  const popupRef = useRef<Window | null>(null);
  const processedRef = useRef<boolean>(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Mutaciones
  const upsertIntegrationMutation = useUpsertIntegrationMutation({
    onSuccess: (data) => {
      setIsConnected(true);
      setError(null);
      setIntegrationId(data.id);
      setConnectedEmail(data.email);
      setIsLoading(false);
    },
    onError: (error) => {
      setIntegrationId(null);
      setIsLoading(false);
      setError("Error al conectar con Calendly. Intenta de nuevo.");
      console.error("Error al guardar la conexión:", error);
    },
  });

  const removeIntegrationMutation = useRemoveIntegrationMutation({
    onSuccess: () => {
      setIsConnected(false);
      setIntegrationId(null);
      setConnectedEmail(null);
      setIsLoading(false);
    },
    onError: (error) => {
      setIsLoading(false);
      setError("Error al desconectar. Intenta de nuevo.");
      console.error("Error al desconectar:", error);
    },
  });

  // Verificar conexión inicial
  const checkInitialConnection = useCallback(() => {
    const hasCalendlyIntegration =
      currentIntegration &&
      currentIntegration.length > 0 &&
      currentIntegration[0].service === SERVICE;

    setIsConnected(!!hasCalendlyIntegration);
    setIsInitialLoading(false); // Termina la carga inicial
  }, [currentIntegration]);

  useEffect(() => {
    checkInitialConnection();
  }, [checkInitialConnection]);

  // Limpiar verifier del storage
  const cleanupPKCE = useCallback(() => {
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  }, []);

  // Manejo de mensajes del popup
  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      // Validar origen
      const isValidOrigin = import.meta.env.DEV
        ? event.origin.includes("localhost") ||
          event.origin.includes("ngrok") ||
          event.origin === window.location.origin
        : event.origin === window.location.origin;

      if (!isValidOrigin) return;

      if (
        event.data.type !== "AUTH_SUCCESS" &&
        event.data.type !== "AUTH_ERROR"
      ) {
        return;
      }

      if (processedRef.current) return;
      processedRef.current = true;

      try {
        if (event.data.type === "AUTH_ERROR") {
          throw new Error(event.data.error || "Error de autenticación");
        }

        if (!event.data.code) {
          throw new Error("No se recibió el código de autorización");
        }

        const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
        if (!codeVerifier) {
          throw new Error(
            "Sesión de autenticación expirada. Intenta de nuevo."
          );
        }

        cleanupPKCE();

        const redirectUri = `${window.location.origin}/auth`;

        upsertIntegrationMutation.mutate({
          userData: { organizationId, userId },
          type: "users",
          query: {
            method: "createOrUpdateIntegration",
            data: {
              operation: "create",
              values: {
                clientId: CLIENT_ID,
                code: event.data.code,
                codeVerifier,
                grantType: "authorization_code",
                redirectUri,
                service: SERVICE,
              },
            },
          },
        });
      } catch (error: any) {
        console.error("Error en autenticación:", error);
        setError(error.message);
        setIsLoading(false);
      } finally {
        // Cleanup popup
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }
        popupRef.current = null;
        cleanupPKCE();

        // Reset processed flag después de un delay
        setTimeout(() => {
          processedRef.current = false;
        }, 2000);
      }
    },
    [userData, upsertIntegrationMutation, cleanupPKCE, organizationId, userId]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      cleanupPKCE();
    };
  }, [handleMessage, cleanupPKCE]);

  // Función para conectar
  const handleLogin = async () => {
    processedRef.current = false;
    setIsLoading(true);
    setError(null);

    try {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);

      sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);

      const parentOrigin = window.location.origin;
      const redirectUri = `${parentOrigin}/auth`;

      const authUrl = `https://auth.calendly.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&state=${encodeURIComponent(
        parentOrigin
      )}&code_challenge=${challenge}&code_challenge_method=S256`;

      const width = 600;
      const height = 700;
      const left = Math.max(0, (window.innerWidth - width) / 2);
      const top = Math.max(0, (window.innerHeight - height) / 2);

      const popup = window.open(
        authUrl,
        "CalendlyAuth",
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        throw new Error("Habilita las ventanas emergentes para continuar");
      }

      popupRef.current = popup;

      // Monitor popup close
      const intervalId = setInterval(() => {
        if (popup.closed) {
          clearInterval(intervalId);
          if (!processedRef.current) {
            setIsLoading(false);
            cleanupPKCE();
          }
        }
      }, 1000);

      cleanupRef.current = () => clearInterval(intervalId);
    } catch (error: any) {
      console.error("Error al iniciar login:", error);
      setError(error.message);
      setIsLoading(false);
      processedRef.current = false;
      cleanupPKCE();
    }
  };

  // Función para desconectar
  const handleDisconnect = async () => {
    if (!integrationId) return;

    setIsLoading(true);
    setError(null);

    removeIntegrationMutation.mutate({
      type: "users",
      userData: { organizationId, userId },
      query: {
        method: "deleteUserIntegration",
        data: {
          id: integrationId,
          service: SERVICE,
        },
      },
    });
  };

  // Estado de carga inicial
  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center p-8 max-w-md mx-auto">
        <div className="text-center mb-8">
          <Link
            to="/connections/integrations"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
          >
            <ArrowLeft size={16} />
            Volver a integraciones
          </Link>

          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-4 mx-auto border border-gray-100">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Calendly</h2>
          <p className="text-gray-600 text-sm">
            Verificando estado de conexión...
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-500" size={20} />
          <span className="text-gray-600 font-medium">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-8 max-w-md mx-auto">
      <div className="text-center mb-8">
        <Link
          to="/connections/integrations"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Volver a integraciones
        </Link>

        <div className="relative w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-4 mx-auto border border-gray-100">
          <div
            className={`absolute inset-1 rounded-2xl opacity-10 ${
              isConnected
                ? "bg-gradient-to-br from-green-500 to-green-600"
                : "bg-gradient-to-br from-blue-500 to-blue-600"
            }`}
          />

          <div
            className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
              isConnected
                ? "bg-gradient-to-br from-green-500 to-green-600"
                : "bg-gradient-to-br bg-white"
            }`}
          >
            {isConnected ? (
              <Check className="w-6 h-6 text-green-200" />
            ) : (
              <img className="w-6 h-6" src={calendlyLogo}></img>
            )}
          </div>

          <div
            className={`absolute inset-0 rounded-3xl blur-xl -z-10 ${
              isConnected
                ? "bg-gradient-to-br from-green-500/20 to-green-600/20"
                : "bg-gradient-to-br from-blue-500/20 to-blue-600/20"
            }`}
          />
        </div>

        <h2 className="text-2xl font-bold text-text-primary mb-2">
          {isConnected ? "Calendly Conectado" : "Conecta tu Calendly"}
        </h2>

        <p className="text-text-secondary text-sm leading-relaxed">
          {isConnected
            ? "Tu cuenta está sincronizada correctamente"
            : "Sincroniza tu calendario"}
        </p>
      </div>

      {/* Content */}
      {isConnected ? (
        <div className="w-full space-y-4">
          {/* Status Card */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-800 font-semibold">
                  Integración Activa
                </p>
                <p className="text-xs text-green-700">
                  {connectedEmail || "Conectado correctamente"}
                </p>
              </div>
            </div>
          </div>

          {/* Disconnect Button */}
          <Button
            onClick={handleDisconnect}
            disabled={isLoading}
            variant="destructive"
            className="w-full h-12 font-semibold transition-all duration-200 hover:scale-[1.02]"
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin" size={18} />
                <span>Desconectando...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <X size={18} />
                <span>Desconectar Calendly</span>
              </div>
            )}
          </Button>
        </div>
      ) : (
        /* Connect Button */
        <Button
          onClick={handleLogin}
          disabled={isLoading}
          className="cursor-pointer w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 font-semibold transition-all duration-200 hover:scale-[1.02]"
        >
          {isLoading ? (
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin" size={18} />
              <span>Conectando...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span>Conectar con Calendly</span>
            </div>
          )}
        </Button>
      )}

      {/* Info Section */}
      <div className="mt-6 w-full">
        <div
          className={`rounded-xl p-4 ${
            isConnected
              ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
              : "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                isConnected ? "bg-green-100" : "bg-blue-100"
              }`}
            >
              {isConnected ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Info className="w-3 h-3 text-blue-600" />
              )}
            </div>
            <div>
              <p
                className={`text-sm font-medium mb-1 ${
                  isConnected ? "text-green-800" : "text-blue-800"
                }`}
              >
                {isConnected ? "Estado de Conexión" : "¿Por qué conectar?"}
              </p>
              <p
                className={`text-xs leading-relaxed ${
                  isConnected ? "text-green-700" : "text-blue-700"
                }`}
              >
                {isConnected
                  ? "El asistente puede acceder a tu calendario en tiempo real para brindarte información precisa sobre tu disponibilidad."
                  : "Permite al asistente acceder a tus citas programadas para proporcionarte información más precisa sobre horarios y disponibilidad."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="w-full mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-3 h-3 text-red-600" />
            </div>
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
