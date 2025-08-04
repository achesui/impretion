import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useUpsertConnectionMutation,
  useGeneralMutation,
  useRemoveConnectionMutation,
} from "@/services/queries";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle } from "lucide-react";
import AddPhone from "./steps/add-phone";
import VerifyCode from "./steps/verify-code";
import ConnectionSuccess from "./steps/connection-success";
import { useQueryClient } from "@tanstack/react-query";

// Esquemas de validación
const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, "El número debe tener al menos 10 dígitos")
    .regex(/^\+?[\d\s\-\(\)]+$/, "Formato de número inválido")
    .transform((val) => val.replace(/[\s\-\(\)]/g, "")), // Limpiar formato
});

const codeSchema = z.object({
  verificationCode: z
    .string()
    .length(6, "El código debe tener 6 dígitos")
    .regex(/^\d+$/, "Solo se permiten números"),
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type CodeFormData = z.infer<typeof codeSchema>;

type NewConnectionProps = {
  onConnectionSuccess?: (phone: string) => void;
  onConnectionRemoved?: () => void;
  organizationId: string;
  userId: string;
  connectionId?: string; // ID de la conexión existente para poder eliminarla
};

export function NewDirectConnection({
  onConnectionSuccess,
  onConnectionRemoved,
  organizationId,
  userId,
  connectionId,
}: NewConnectionProps) {
  const [currentStep, setCurrentStep] = useState<
    "initial" | "phone" | "code" | "success"
  >("initial");
  const [phoneNumber, setPhoneNumber] = useState("");
  const queryClient = useQueryClient();

  // Hook para insertar la conexión en la base de datos
  const createConnectionMutation = useUpsertConnectionMutation({
    onSuccess: async () => {
      setCurrentStep("success");
      onConnectionSuccess?.(phoneNumber);

      // Invalidación de cache
      await queryClient.invalidateQueries({
        queryKey: ["connection"],
      });
    },
    onError: (error) => {
      console.error("Error al guardar la conexión en base de datos:", error);
      codeForm.setError("verificationCode", {
        type: "manual",
        message: "Error al guardar la conexión. Intenta nuevamente.",
      });
    },
  });

  // Hook para eliminar la conexión
  const removeConnectionMutation = useRemoveConnectionMutation({
    onSuccess: async () => {
      resetProcess();
      onConnectionRemoved?.();

      // Invalidación de cache para refrescar los datos
      await queryClient.invalidateQueries({
        queryKey: ["connection", "direct"],
      });
    },
    onError: (error) => {
      console.error("Error al eliminar la conexión:", error);
    },
  });

  // Formulario para número de teléfono
  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: "",
    },
  });

  // Formulario para código de verificación
  const codeForm = useForm<CodeFormData>({
    resolver: zodResolver(codeSchema),
    defaultValues: {
      verificationCode: "",
    },
  });

  // Mutación para enviar el código de verificación
  const sendCodeMutation = useGeneralMutation({
    onSuccess: () => {
      setCurrentStep("code");
    },
    onError: (error) => {
      console.error("Error al enviar el código:", error);
      phoneForm.setError("phone", {
        type: "manual",
        message:
          "Ha ocurrido un error al enviar el código. Intenta nuevamente.",
      });
    },
  });

  // Mutación para verificar el código
  const verifyCodeMutation = useGeneralMutation({
    onSuccess: () => {
      // Una vez verificado el código, insertar la conexión en la base de datos
      createConnectionMutation.mutate({
        userData: { organizationId, userId },
        type: "connections",
        query: {
          method: "createConnection",
          data: {
            connectedWith: `+57${phoneNumber}`,
            provider: "whatsapp",
            type: "direct",
          },
        },
      });
    },
    onError: (error) => {
      console.error("Error al verificar el código:", error);
      codeForm.setError("verificationCode", {
        message: "El código es inválido o ya venció. Intenta nuevamente.",
      });
    },
  });

  const onSubmitPhone = (data: PhoneFormData) => {
    setPhoneNumber(data.phone);
    sendCodeMutation.mutate({
      workerUrl: "http://localhost:3005",
      route: "/channels/twilio/verification",
      data: {
        to: `+57${data.phone}`,
      },
    });
  };

  const onSubmitCode = (data: CodeFormData) => {
    verifyCodeMutation.mutate({
      workerUrl: "http://localhost:3005",
      route: "/channels/twilio/verification-validation",
      data: {
        to: `57${phoneNumber}`,
        code: data.verificationCode,
      },
    });
  };

  const handleRemoveConnection = () => {
    if (!connectionId) {
      console.error("No se puede eliminar la conexión: ID no proporcionado");
      return;
    }

    removeConnectionMutation.mutate({
      type: "connections",
      query: {
        method: "removeConnection",
        data: {
          type: "direct",
          id: connectionId,
        },
      },
      userData: {
        organizationId,
      },
    });
  };

  const resetProcess = () => {
    setCurrentStep("initial");
    setPhoneNumber("");
    phoneForm.reset();
    codeForm.reset();
    sendCodeMutation.reset();
    verifyCodeMutation.reset();
    createConnectionMutation.reset();
  };

  const goBackToPhone = () => {
    setCurrentStep("phone");
    codeForm.reset();
    verifyCodeMutation.reset();
  };

  const resendCode = () => {
    codeForm.reset();
    verifyCodeMutation.reset();
    sendCodeMutation.mutate({
      workerUrl: "http://localhost:3005",
      route: "/verification",
      data: {
        to: phoneNumber,
      },
    });
  };

  // Helper para determinar si alguna mutación está en proceso
  const isLoading =
    sendCodeMutation.isPending ||
    verifyCodeMutation.isPending ||
    createConnectionMutation.isPending ||
    removeConnectionMutation.isPending;

  return (
    // El contenedor principal debe tomar toda la altura disponible y centrar el contenido
    <div className="h-full w-full flex items-center justify-center">
      {/* Contenedor del contenido centrado con ancho máximo */}
      <div className="w-full max-w-md px-6">
        {/* Indicador de pasos - solo visible en phone y code */}
        {(currentStep === "phone" || currentStep === "code") && (
          <div className="flex items-center justify-center space-x-2 mb-8">
            <div
              className={`w-2 h-2 rounded-full ${
                currentStep === "phone" ? "bg-[#075e54]" : "bg-[#075e54]"
              }`}
            />
            <div
              className={`w-2 h-2 rounded-full ${
                currentStep === "code" ? "bg-[#075e54]" : "bg-gray-300"
              }`}
            />
            <span className="text-xs text-text-primary ml-2">
              Paso {currentStep === "phone" ? "1" : "2"} de 2
            </span>
          </div>
        )}

        {/* Estado inicial */}
        {currentStep === "initial" && (
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-[#25d366] flex items-center justify-center mx-auto border border-[#25d366]">
              <MessageCircle className="w-8 h-8" color="white" />
            </div>
            <div>
              <h3 className="font-semibold text-xl text-gray-900">
                Conecta tu WhatsApp personal
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Comunícate con tu empresa, edita información y obtén datos
                directamente por WhatsApp, sin tener que entrar a esta
                plataforma cada vez. Solo necesitas enviar un mensaje y el
                asistente se encarga del resto.
              </p>
            </div>
            <Button
              onClick={() => setCurrentStep("phone")}
              className="cursor-pointer w-full bg-[#075e54] hover:bg-[#075e54] text-white rounded-lg transition-colors duration-200 font-medium flex items-center justify-center space-x-2"
            >
              <Phone className="w-4 h-4" />
              <span>Conectar número</span>
            </Button>
          </div>
        )}

        {/* Formulario de teléfono */}
        {currentStep === "phone" && (
          <AddPhone
            phoneForm={phoneForm}
            sendCodeMutation={sendCodeMutation}
            onSubmitPhone={onSubmitPhone}
            resetProcess={resetProcess}
          />
        )}

        {/* Formulario de código */}
        {currentStep === "code" && (
          <VerifyCode
            codeForm={codeForm}
            verifyCodeMutation={verifyCodeMutation}
            onSubmitCode={onSubmitCode}
            goBackToPhone={goBackToPhone}
            resendCode={resendCode}
            createConnectionMutation={createConnectionMutation}
            isLoading={isLoading}
            phoneNumber={phoneNumber}
          />
        )}

        {/* Estado de éxito */}
        {currentStep === "success" && (
          <ConnectionSuccess
            phoneNumber={phoneNumber}
            removeConnectionMutation={removeConnectionMutation}
            onRemoveConnection={handleRemoveConnection}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
