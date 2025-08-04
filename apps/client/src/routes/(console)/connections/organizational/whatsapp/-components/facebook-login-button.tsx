import { useEffect, useState } from "react";
import { UseFormSetValue } from "react-hook-form";

type FacebookLoginButtonProps = {
  appId: string;
  configId: string;
  solutionId: string;
  setValue: UseFormSetValue<{
    wabaId: string;
    senderId: string;
    assistantId: string;
  }>;
};

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

const FacebookLoginButton: React.FC<FacebookLoginButtonProps> = ({
  setValue,
  appId,
  configId,
  solutionId,
}) => {
  const [isFbSdkLoaded, setIsFbSdkLoaded] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");

  useEffect(() => {
    // Asegurarse de que se ejecute solo en el cliente.
    if (typeof window === "undefined") return;

    // Asignar la función fbAsyncInit que se llamará cuando el SDK se cargue.
    window.fbAsyncInit = () => {
      window.FB.init({
        appId: appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v21.0",
      });
      setIsFbSdkLoaded(true);
    };

    // Solo carga el script si aún no está presente.
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";

      // Se agrega al final del body.
      document.body.appendChild(script);
    } else if (window.FB) {
      // Si ya existe el script y FB está definido, se marca como cargado.
      setIsFbSdkLoaded(true);
    }

    // Listener para capturar los mensajes del Embedded Signup.
    const handleEmbeddedSignupMessages = (event: MessageEvent<any>) => {
      // Validamos que el mensaje provenga de facebook.com.
      if (!event.origin.endsWith("facebook.com")) return;

      try {
        const data = JSON.parse(event.data);
        if (data.type === "WA_EMBEDDED_SIGNUP") {
          if (data.event === "FINISH" || data.event === "FINISH_ONLY_WABA") {
            const { phone_number_id, waba_id } = data.data;
            setValue("wabaId", waba_id);
            setConnectionStatus("connected");
            setIsConnecting(false);
            console.log(phone_number_id);
          } else if (data.event === "CANCEL") {
            const { current_step } = data.data;
            console.warn("Signup cancelled at step:", current_step);
            setConnectionStatus("idle");
            setIsConnecting(false);
          } else if (data.event === "ERROR") {
            console.log(data);
            const { error_message } = data.data;
            console.error("Signup error:", error_message);
            setConnectionStatus("error");
            setIsConnecting(false);
          }
        }
      } catch (error) {
        console.log("Non-JSON response from Facebook:", event.data);
      }
    };

    // Listener para detectar cuando se cierra la ventana de Facebook sin completar
    const handleWindowFocus = () => {
      // Solo si estaba conectando y no se completó exitosamente
      if (isConnecting && connectionStatus === "connecting") {
        // Dar un pequeño delay para asegurarse de que no sea un cambio de ventana temporal
        setTimeout(() => {
          if (connectionStatus === "connecting") {
            console.log("Facebook window closed without completion");
            setConnectionStatus("idle");
            setIsConnecting(false);
          }
        }, 1000);
      }
    };

    window.addEventListener("message", handleEmbeddedSignupMessages);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("message", handleEmbeddedSignupMessages);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [appId, configId, solutionId, setValue, isConnecting, connectionStatus]);

  const handleLoginClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevenir que se dispare el formulario
    e.stopPropagation(); // Detener la propagación del evento

    // Verificar que el SDK esté cargado e inicializado.
    if (!isFbSdkLoaded) {
      console.error("Facebook SDK is not loaded/initialized yet.");
      return;
    }
    if (!window.FB) {
      console.error("Facebook SDK object not available.");
      return;
    }

    setIsConnecting(true);
    setConnectionStatus("connecting");

    try {
      window.FB.login(
        (response: any) => {
          console.log("FB login response:", response);
          if (response.status === "unknown") {
            setIsConnecting(false);
            setConnectionStatus("idle");
          }
        },
        {
          config_id: configId,
          //auth_type: "rerequest",
          response_type: "code",
          override_default_response_type: true,
          extras: {
            setup: {
              solutionID: solutionId,
            },
            //featureType: "whatsapp_business_app_onboarding",
            sessionInfoVersion: 3,
          },
        }
      );
    } catch (error) {
      console.error("Error calling FB.login:", error);
      setConnectionStatus("error");
      setIsConnecting(false);
    }
  };

  const getButtonText = () => {
    switch (connectionStatus) {
      case "connecting":
        return "Conectando...";
      case "connected":
        return "Conectado con Facebook";
      case "error":
        return "Error - Reintentar";
      default:
        return isFbSdkLoaded ? "Conectar con Facebook" : "Cargando";
    }
  };

  const getButtonIcon = () => {
    switch (connectionStatus) {
      case "connecting":
        return (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        );
      case "connected":
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case "error":
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        );
    }
  };

  const getButtonClasses = () => {
    const baseClasses =
      "flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed w-full";

    switch (connectionStatus) {
      case "connected":
        return `${baseClasses} bg-green-600 hover:bg-green-700 focus:ring-green-500`;
      case "error":
        return `${baseClasses} bg-red-600 hover:bg-red-700 focus:ring-red-500`;
      case "connecting":
        return `${baseClasses} bg-blue-600 opacity-80 cursor-wait`;
      default:
        return `${baseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 ${!isFbSdkLoaded ? "opacity-60" : ""}`;
    }
  };

  return (
    <div className="w-full space-y-3">
      <button
        type="button"
        onClick={handleLoginClick}
        disabled={
          !isFbSdkLoaded || isConnecting || connectionStatus === "connected"
        }
        className={getButtonClasses()}
      >
        {getButtonIcon()}
        <span className="text-sm font-medium">{getButtonText()}</span>
      </button>

      {/* Status Messages */}
      {connectionStatus === "connected" && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <svg
            className="w-4 h-4 text-green-600 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <p className="text-sm text-green-700">
            Tu cuenta de Facebook se ha conectado exitosamente
          </p>
        </div>
      )}

      {connectionStatus === "error" && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <svg
            className="w-4 h-4 text-red-600 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <p className="text-sm text-red-700">
            Hubo un error al conectar. Intenta de nuevo.
          </p>
        </div>
      )}

      {connectionStatus === "connecting" && (
        <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
          <p className="text-sm text-blue-700 flex">
            Por favor, completa el proceso en la ventana emergente.
          </p>
        </div>
      )}
    </div>
  );
};

export default FacebookLoginButton;
