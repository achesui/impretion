import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { NewSelect } from "@/components/customized/new-select";
import {
  getAssistantQO,
  useUpsertConnectionMutation,
} from "@/services/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { authUserData } from "@/lib/auth-handler";
import { queryClient } from "@/router";
import FacebookLoginButton from "../-components/facebook-login-button";

export const Route = createFileRoute(
  "/(console)/connections/organizational/whatsapp/create/"
)({
  loader: async ({ context: { queryClient, auth } }) => {
    const userData = await authUserData(auth);

    await queryClient.ensureQueryData(
      getAssistantQO({
        type: "assistants",
        query: {
          method: "getAssistants",
          data: {},
        },
        userData,
      })
    );

    return {
      userData,
    };
  },
  component: RouteComponent,
});

const FormSchema = z.object({
  wabaId: z.string().min(1, {
    message: "Id del perfil de whatsapp no encontrado.",
  }),
  senderId: z.string().min(1, {
    message: "Número no encontrado.",
  }),
  assistantId: z.string().min(1, {
    message: "Asistente no encontrado.",
  }),
});

type FormValues = {
  wabaId: string;
  senderId: string;
  assistantId: string;
};

function RouteComponent() {
  const { userData } = Route.useLoaderData();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    watch,
    control,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      senderId: "",
      assistantId: "",
      wabaId: "",
    },
  });

  const watchedValues = watch();

  const { data: currentAssistants } = useSuspenseQuery(
    getAssistantQO({
      type: "assistants",
      query: {
        method: "getAssistants",
        data: {},
      },
      userData,
    })
  );

  // Hook para insertar la conexión en la base de datos
  const createConnectionMutation = useUpsertConnectionMutation({
    onSuccess: async () => {
      //setCurrentStep("success");
      window.location.href = "/connections/organizational/whatsapp";
      // Invalidación de cache
      await queryClient.invalidateQueries({
        queryKey: ["connection"],
      });
    },
    onError: (error) => {
      console.error("Error al guardar la conexión en base de datos:", error);
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      // Envio de datos al backend de twilio.
      console.log("Datos a twilio", data);
      console.log("userData => ", userData);
      createConnectionMutation.mutate({
        type: "connections",
        query: {
          method: "createConnection",
          data: {
            connectedWith: `+${data.senderId}`,
            provider: "whatsapp",
            type: "organizational",
            // Datos necesarios para la conexión organizacional con Twilio.
            organizationalData: {
              organizationId: userData.organizationId,
              wabaId: data.wabaId,
              assistantId: data.assistantId,
              phone: `+${data.senderId}`,
            },
          },
        },
        userData,
      });
    } catch (error) {
      console.error("Error", error);
    }
  };

  const getStepStatus = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return watchedValues.senderId
          ? "completed"
          : errors.senderId
            ? "error"
            : "pending";
      case 2:
        return watchedValues.assistantId
          ? "completed"
          : errors.assistantId
            ? "error"
            : "pending";
      case 3:
        return watchedValues.wabaId
          ? "completed"
          : errors.wabaId
            ? "error"
            : "pending";
      default:
        return "pending";
    }
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return !!watchedValues.senderId;
      case 2:
        return !!watchedValues.assistantId;
      case 3:
        return !!watchedValues.wabaId;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps && canGoNext()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepComplete = (stepNumber: number) => {
    return getStepStatus(stepNumber) === "completed";
  };

  const allStepsComplete = () => {
    return (
      watchedValues.senderId &&
      watchedValues.assistantId &&
      watchedValues.wabaId
    );
  };

  const getProgressPercentage = () => {
    let completedSteps = 0;
    if (watchedValues.senderId) completedSteps++;
    if (watchedValues.assistantId) completedSteps++;
    if (watchedValues.wabaId) completedSteps++;
    return (completedSteps / totalSteps) * 100;
  };

  const getAssistantName = (assistantId: string) => {
    const assistant = currentAssistants.find(
      (assistant) => assistant.id === assistantId
    );
    return assistant ? assistant.name : "";
  };

  const renderCompletedSteps = () => {
    const completedInfo = [];

    if (currentStep > 1 && watchedValues.senderId) {
      completedInfo.push({
        label: "Número de WhatsApp:",
        value: `+${watchedValues.senderId}`,
        step: 1,
      });
    }

    if (currentStep > 2 && watchedValues.assistantId) {
      completedInfo.push({
        label: "Asistente seleccionado:",
        value: getAssistantName(watchedValues.assistantId),
        step: 2,
      });
    }

    if (completedInfo.length === 0) return null;

    return (
      <div className="mb-6 p-3 bg-soft-surface border border-border rounded-lg">
        <div className="space-y-1">
          {completedInfo.map((info) => (
            <div key={info.step} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-text-primary flex-shrink-0" />
              <span className="text-sm text-text-primary">
                <strong>{info.label}</strong> {info.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepContent
            title="Ingresa tu número de WhatsApp"
            description="Proporciona el mismo número que colocaste para registrar."
            error={errors.senderId?.message}
          >
            <Input
              type="text"
              placeholder="Número registrado, Ejemplo: 3121345678"
              className={`w-full transition-colors duration-200 ${
                errors.senderId
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : watchedValues.senderId
                    ? "border-green-300 focus:border-green-500 focus:ring-green-500"
                    : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
              }`}
              {...register("senderId")}
            />
          </StepContent>
        );
      case 2:
        return (
          <StepContent
            title="Selecciona tu asistente"
            description="Este asistente será el que atienda a tus clientes desde el número registrado."
            error={errors.assistantId?.message}
          >
            <Controller
              name="assistantId"
              control={control}
              rules={{ required: "Asistente es requerido" }}
              render={({ field }) => (
                <NewSelect
                  triggerClassName={`w-full transition-colors duration-200 ${
                    errors.assistantId
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : watchedValues.assistantId
                        ? "border-green-300 focus:border-green-500 focus:ring-green-500"
                        : "border-gray-300 focus:ring-indigo-500"
                  }`}
                  placeholder="Selecciona un asistente"
                  value={field.value}
                  content={currentAssistants.map(({ name, id }) => ({
                    label: name,
                    value: id as string,
                  }))}
                  defaultValue={{
                    label: currentAssistants[0]?.name ?? "",
                    value: currentAssistants[0]?.id ?? "",
                  }}
                  onChange={(value) => field.onChange(value)}
                />
              )}
            />
          </StepContent>
        );
      case 3:
        return (
          <StepContent
            title="Conecta tu portafolio de negocios con tu cuenta de Facebook"
            description="Conecta tu portafolio de Facebook a Impretion para administrar a tus clientes con tu asistente de Inteligencia Artificial."
            error={errors.wabaId?.message}
          >
            <FacebookLoginButton
              setValue={setValue}
              appId={import.meta.env.VITE_FACEBOOK_APP_ID}
              configId={import.meta.env.VITE_FACEBOOK_CONFIG_ID}
              solutionId={import.meta.env.VITE_PARTNER_SOLUTION_ID}
            />
          </StepContent>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 flex gap-2 flex-col">
      <Link
        to="/connections/organizational/whatsapp"
        className="w-fit px-3 py-2 rounded-md text-white bg-text-primary hover:bg-text-primary cursor-pointer flex gap-2 items-center"
      >
        <ArrowLeft className="w-4 h-4 text-white" />
        <p>Volver</p>
      </Link>

      <div className="bg-white rounded-xl overflow-hidden border-border border">
        <div className="bg-gradient-to-r bg-soft-surface px-6 py-4 text-text-primary">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">
            Conecta tu WhatsApp Business a nuestra plataforma
          </h1>
          <p className="text-text-secondary text-sm">
            Configura tu asistente de IA en 3 sencillos pasos
          </p>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Paso {currentStep} de {totalSteps}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(getProgressPercentage())}% completado
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-500 to-green-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                    isStepComplete(step)
                      ? "bg-green-500 text-white"
                      : step === currentStep
                        ? "bg-[#075e54] text-white"
                        : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {isStepComplete(step) ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    step
                  )}
                </div>
                <span className="text-xs text-gray-500 mt-1 hidden sm:block">
                  {step === 1
                    ? "WhatsApp"
                    : step === 2
                      ? "Asistente"
                      : "Facebook"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step Content */}
          <div className="p-6 flex flex-col justify-center">
            {renderCompletedSteps()}
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className={`${currentStep === 1 ? "invisible" : ""} flex items-center gap-2`}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!canGoNext()}
                className="flex items-center gap-2 bg-[#075e54] hover:bg-text-primary"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || !allStepsComplete()}
                className="cursor-pointer bg-[#075e54] hover:bg-[#075e54] text-white font-semibold px-6"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Conectando
                  </div>
                ) : (
                  "Conectar WhatsApp"
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

interface StepContentProps {
  children: React.ReactNode;
  title: string;
  description: string;
  error?: string;
}

function StepContent({
  children,
  title,
  description,
  error,
}: StepContentProps) {
  return (
    <div className="text-center space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          {title}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {description}
        </p>
      </div>

      {error && (
        <div className="mx-auto max-w-md p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 justify-center">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto">{children}</div>
    </div>
  );
}
