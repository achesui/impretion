import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Check,
  X,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { generateCodeVerifier, generateCodeChallenge } from "@/lib/pkce";
import {
  useRemoveIntegrationMutation,
  useUpsertIntegrationMutation,
} from "@/services/queries";
import { Link } from "@tanstack/react-router";
import { GetUserDataResponse } from "@core-service/types";
import { UserData } from "@base/shared-types";
import { getServiceConfig, generateAuthUrl } from "../-configuration/services";
import { AdditionalField, IntegrationFormData } from "types";

const PKCE_VERIFIER_KEY = "pkce_code_verifier";
const AUTH_SESSION_KEY = "auth_session_data";

/**
 * Renderiza dinamicamente un campo de formulario requerido para algún servicio
 * Ej: Shopify pide el subodminio de la store.
 */
const AdditionalFieldRenderer = ({
  field,
  value,
  onChange,
  error,
}: {
  field: AdditionalField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) => {
  const baseClasses = "w-full transition-all duration-200";
  const errorClasses = error
    ? "border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50"
    : "focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  switch (field.type) {
    case "select":
      return (
        <div className="space-y-2">
          <Label
            htmlFor={field.id}
            className="text-sm font-medium text-gray-700 flex items-center gap-2"
          >
            {field.label}
            {field.required && <span className="text-red-500 text-xs">*</span>}
          </Label>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className={`${baseClasses} ${errorClasses}`}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.description && (
            <p className="text-xs text-gray-500 leading-relaxed">
              {field.description}
            </p>
          )}
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </p>
          )}
        </div>
      );

    case "textarea":
      return (
        <div className="space-y-2">
          <Label
            htmlFor={field.id}
            className="text-sm font-medium text-gray-700 flex items-center gap-2"
          >
            {field.label}
            {field.required && <span className="text-red-500 text-xs">*</span>}
          </Label>
          <Textarea
            id={field.id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={`${baseClasses} ${errorClasses} min-h-[100px] resize-none`}
          />
          {field.description && (
            <p className="text-xs text-gray-500 leading-relaxed">
              {field.description}
            </p>
          )}
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </p>
          )}
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          <Label
            htmlFor={field.id}
            className="text-sm font-medium text-gray-700 flex items-center gap-2"
          >
            {field.label}
            {field.required && <span className="text-red-500 text-xs">*</span>}
          </Label>
          <Input
            id={field.id}
            type={field.type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={`${baseClasses} ${errorClasses}`}
          />
          {field.description && (
            <p className="text-xs text-gray-500 leading-relaxed">
              {field.description}
            </p>
          )}
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </p>
          )}
        </div>
      );
  }
};

export default function UniversalAuthComponent({
  currentIntegration,
  userData,
  serviceName,
}: {
  currentIntegration: GetUserDataResponse["integrations"][0];
  userData: UserData;
  serviceName: string;
}) {
  const { organizationId, userId } = userData;
  const serviceConfig = getServiceConfig(serviceName);

  if (!serviceConfig) {
    return (
      <div className="flex flex-col items-center p-8 max-w-md mx-auto">
        <div className="w-full bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-800 font-medium">
                Servicio no configurado
              </p>
              <p className="text-xs text-red-700">
                El servicio "{serviceName}" no está disponible.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // El estado isLoading ahora solo se usa para la desconexión
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [integrationId, setIntegrationId] = useState<string | null>(
    currentIntegration?.id ?? null,
  );
  const [connectedEmail, setConnectedEmail] = useState<string | null>(
    currentIntegration?.connectedEmail ?? null,
  );

  const [formData, setFormData] = useState<IntegrationFormData>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const popupRef = useRef<Window | null>(null);
  const processedRef = useRef<boolean>(false);

  const upsertIntegrationMutation = useUpsertIntegrationMutation({
    onSuccess: (data) => {
      setIsConnected(true);
      setError(null);
      setIntegrationId(data.id);
      setConnectedEmail(data.email);
      setFormData({});
      setFieldErrors({});
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    },
    onError: (error) => {
      setIntegrationId(null);
      setError(
        `Error al conectar con ${serviceConfig.displayName}. Intenta de nuevo.`,
      );
      console.error("Error al guardar la conexión:", error);
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    },
  });

  const removeIntegrationMutation = useRemoveIntegrationMutation({
    onSuccess: () => {
      setIsConnected(false);
      setIntegrationId(null);
      setConnectedEmail(null);
      setIsLoading(false); // La desconexión SÍ usa el loader
      setFormData({});
      setFieldErrors({});
    },
    onError: (error) => {
      setIsLoading(false); // La desconexión SÍ usa el loader
      setError("Error al desconectar. Intenta de nuevo.");
      console.error("Error al desconectar:", error);
    },
  });

  const checkInitialConnection = useCallback(() => {
    const hasIntegration =
      currentIntegration && currentIntegration.service === serviceName;
    setIsConnected(!!hasIntegration);
    setIsInitialLoading(false);
  }, [currentIntegration, serviceName]);

  useEffect(() => {
    checkInitialConnection();
  }, [checkInitialConnection]);

  const validateFields = (): boolean => {
    const errors: Record<string, string> = {};
    serviceConfig.additionalFields?.forEach((field) => {
      const value = (formData[field.id] as string) || "";
      if (field.required && !value.trim()) {
        errors[field.id] = `${field.label} es requerido`;
        return;
      }
      if (value && field.validation?.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          errors[field.id] =
            field.validation.message ||
            `${field.label} no tiene el formato correcto`;
        }
      }
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const cleanupAuthData = useCallback(() => {
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  }, []);

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
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

      if (event.data.service && event.data.service !== serviceName) {
        console.warn(
          `Mensaje de servicio diferente: ${event.data.service} vs ${serviceName}`,
        );
        processedRef.current = false;
        return;
      }

      try {
        if (event.data.type === "AUTH_ERROR") {
          throw new Error(event.data.error || "Error de autenticación");
        }

        if (!event.data.code) {
          throw new Error("No se recibió el código de autorización");
        }

        const sessionData = sessionStorage.getItem(AUTH_SESSION_KEY);
        if (!sessionData) {
          throw new Error(
            "Sesión de autenticación expirada. Intenta de nuevo.",
          );
        }

        const { codeVerifier, formData: savedFormData } =
          JSON.parse(sessionData);

        if (!codeVerifier && serviceConfig.authConfig.codeChallenge) {
          throw new Error("Código de verificación no encontrado.");
        }

        //  cleanupAuthData();

        const redirectUri = `${window.location.origin}/auth`;

        const integrationData: any = {
          clientId: serviceConfig.clientId || "",
          code: event.data.code,
          grantType: "authorization_code",
          redirectUri,
          service: serviceName,
          ...savedFormData,
        };

        if (serviceConfig.authConfig.codeChallenge && codeVerifier) {
          integrationData.codeVerifier = codeVerifier;
        }

        console.log("evento ====> ", event);

        if (serviceName === "shopify") {
          integrationData.shop = event.data.shop;
          integrationData.hmac = event.data.hmac;
          integrationData.timestamp = event.data.timestamp;
          integrationData.state = event.data.state;
          integrationData.host = event.data.host;
        }

        if (serviceName === "google_calendar") {
          integrationData.scope = event.data.scope;
        }

        console.log("datos de integracion => ", integrationData);
        const { clientId, ...data } = integrationData;

        upsertIntegrationMutation.mutate({
          type: "users",
          query: {
            method: "createIntegration",
            data,
          },
          userData,
        });
      } catch (error: any) {
        console.error("Error en autenticación:", error);
        setError(error.message);
        processedRef.current = false;
      } finally {
        if (popupRef.current && !popupRef.current.closed) {
          // popupRef.current.close();
        }
        popupRef.current = null;
        setTimeout(() => {
          processedRef.current = false;
        }, 2000);
      }
    },
    [
      userData,
      upsertIntegrationMutation,
      //cleanupAuthData,
      organizationId,
      userId,
      serviceName,
      serviceConfig,
    ],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [handleMessage]);

  const handleLogin = async () => {
    if (serviceConfig.additionalFields && !validateFields()) {
      return;
    }

    processedRef.current = false;
    setError(null);

    try {
      const parentOrigin = window.location.origin;
      const redirectUri = `${parentOrigin}/auth`;

      let codeVerifier = "",
        codeChallenge = "";

      if (serviceConfig.authConfig.codeChallenge) {
        codeVerifier = generateCodeVerifier();
        codeChallenge = await generateCodeChallenge(codeVerifier);
      }

      const sessionData = {
        codeVerifier,
        formData,
        service: serviceName,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));

      const additionalParams: Record<string, string> = {};
      if (serviceName === "shopify") {
        const shopUrl = formData.shopUrl as string;
        additionalParams.shop = shopUrl;
      }

      const stateObject = {
        origin: parentOrigin,
        service: serviceName,
        nonce: Math.random().toString(36).substring(2, 15),
      };
      const state = btoa(JSON.stringify(stateObject));

      const authUrl = generateAuthUrl(serviceConfig, {
        redirectUri,
        state,
        codeChallenge,
        additionalParams,
      });

      const width = 600,
        height = 700;
      const left = Math.max(0, (window.innerWidth - width) / 2);
      const top = Math.max(0, (window.innerHeight - height) / 2);

      const popup = window.open(
        authUrl,
        `${serviceConfig.displayName}Auth`,
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`,
      );

      if (!popup) {
        alert(
          "Por favor, habilita las ventanas emergentes para poder continuar.",
        );
        throw new Error("Habilita las ventanas emergentes para continuar");
      }

      popupRef.current = popup;
    } catch (error: any) {
      console.error("Error al iniciar login:", error);
      setError(error.message);
      processedRef.current = false;
      // cleanupAuthData();
    }
  };

  const handleDisconnect = async () => {
    if (!integrationId) return;

    setIsLoading(true); // El loader SÍ se activa para la desconexión
    setError(null);

    removeIntegrationMutation.mutate({
      type: "users",
      userData: { organizationId, userId },
      query: {
        method: "deleteUserIntegration",
        data: {
          id: integrationId,
          service: serviceName,
        },
      },
    });
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [fieldId]: value }));
    if (fieldErrors[fieldId]) {
      setFieldErrors((prev) => ({ ...prev, [fieldId]: "" }));
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center p-8 max-w-lg mx-auto">
        {/* ... (JSX de carga inicial sin cambios) ... */}
        <div className="text-center mb-8">
          <Link
            to="/connections/integrations"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Volver a integraciones
          </Link>
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 mx-auto border border-gray-100 shadow-lg">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center animate-pulse">
              <div className="w-8 h-8 bg-gray-300 rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-2 mb-6">
            <div className="h-6 bg-gray-200 rounded animate-pulse mx-auto w-48" />
            <div className="h-4 bg-gray-100 rounded animate-pulse mx-auto w-64" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-500" size={20} />
          <span className="text-gray-600 font-medium">
            Verificando estado de conexión...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-8 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <Link
          to="/connections/integrations"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Volver a integraciones
        </Link>
        <div className="relative w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 mx-auto border border-gray-100 shadow-lg">
          <div
            className={`absolute inset-2 rounded-2xl opacity-10 ${
              isConnected
                ? "bg-gradient-to-br from-green-500 to-green-600"
                : `bg-gradient-to-br from-${serviceConfig.colors.gradientFrom} to-${serviceConfig.colors.gradientTo}`
            }`}
          />
          <div
            className={`relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 ${
              isConnected
                ? "bg-gradient-to-br from-green-500 to-green-600"
                : "bg-gradient-to-br bg-white"
            }`}
          >
            {isConnected ? (
              <Check className="w-8 h-8 text-green-700" />
            ) : (
              <img
                className="w-8 h-8"
                src={serviceConfig.logo}
                alt={serviceConfig.displayName}
              />
            )}
          </div>
          {isConnected && (
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-green-500/20 to-green-600/20 blur-xl -z-10" />
          )}
        </div>
        <h2 className="text-3xl font-bold text-text-primary mb-3">
          {isConnected
            ? `${serviceConfig.displayName} Conectado`
            : `Conecta ${serviceConfig.displayName}`}
        </h2>
        <p className="text-gray-600 text-base leading-relaxed max-w-md mx-auto">
          {isConnected
            ? serviceConfig.description.connected
            : serviceConfig.description.disconnected}
        </p>
      </div>

      {isConnected ? (
        <div className="w-full space-y-6">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-base text-green-800 font-semibold">
                  Integración Activa
                </p>
                <p className="text-sm text-green-700">
                  {connectedEmail || "Conectado correctamente"}
                </p>
              </div>
            </div>
          </div>
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
                <span>Desconectar {serviceConfig.displayName}</span>
              </div>
            )}
          </Button>
        </div>
      ) : (
        <div className="w-full space-y-6">
          {serviceConfig.additionalFields &&
            serviceConfig.additionalFields.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-text-primary">
                  Información requerida
                </h3>
                {serviceConfig.additionalFields.map((field) => (
                  <AdditionalFieldRenderer
                    key={field.id}
                    field={field}
                    value={(formData[field.id] as string) || ""}
                    onChange={(value) => handleFieldChange(field.id, value)}
                    error={fieldErrors[field.id]}
                  />
                ))}
              </div>
            )}

          {/* --- CAMBIO EN EL BOTÓN DE CONEXIÓN --- */}
          {/* Ya no necesita la lógica condicional para el loader */}
          <Button
            onClick={handleLogin}
            // El botón ya no se deshabilita durante la conexión
            disabled={false}
            className={`w-full h-12 bg-gradient-to-r from-${serviceConfig.colors.gradientFrom} to-${serviceConfig.colors.gradientTo} hover:opacity-90 font-semibold transition-all duration-200 hover:scale-[1.02] text-white`}
          >
            <div className="flex items-center gap-3">
              <Shield size={18} />
              <span>Conectar con {serviceConfig.displayName}</span>
            </div>
          </Button>

          <div
            className={`rounded-xl p-4 bg-gradient-to-r from-${serviceConfig.colors.primary}/10 to-${serviceConfig.colors.secondary}/10 border border-${serviceConfig.colors.primary}/20`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-${serviceConfig.colors.accent}`}
              >
                <Shield
                  className={`w-3 h-3 text-${serviceConfig.colors.primary}`}
                />
              </div>
              <div>
                <p
                  className={`text-sm font-medium mb-1 text-${serviceConfig.colors.secondary}`}
                >
                  Conexión Segura
                </p>
                <p
                  className={`text-xs leading-relaxed text-${serviceConfig.colors.primary}`}
                >
                  Utilizamos{" "}
                  {serviceConfig.authConfig.method === "pkce"
                    ? "OAuth 2.0 con PKCE"
                    : serviceConfig.authConfig.method === "hmac"
                      ? "HMAC"
                      : "autenticación segura"}{" "}
                  para proteger tu información. Tu información está cifrada y
                  nunca compartimos tus credenciales.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="w-full mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
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
