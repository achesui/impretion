import { useForm, Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import {
  getAssistantQO,
  useUpdateAssistantConfigurationMutation,
} from "@/services/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { authUserData } from "@/lib/auth-handler";

export const Route = createFileRoute(
  "/(console)/assistants/$assistantId/configuracion"
)({
  loader: async ({ context: { queryClient, auth }, params }) => {
    const { organizationId, userId } = await authUserData(auth);

    const { assistantId } = params;

    await queryClient.ensureQueryData(
      getAssistantQO({
        type: "assistants",
        query: {
          method: "getAssistants",
          data: {},
        },
        userData: {
          organizationId: "",
        },
      })
    );
    return { organizationId, assistantId, userId };
  },
  component: RouteComponent,
});

type FormValues = {
  personalities: {
    friendliness: number;
    seriousness: number;
    empathy: number;
    confidence: number;
    professionalism: number;
    patience: number;
    curiosity: number;
    emojis: number;
  };
};

const personalitiesMap = {
  friendliness: {
    label: "Amabilidad",
    description:
      "Qué tan simpático y cercano debe ser el asistente al hablar con clientes.",
    low: "Muy conservador, sin sonrisas ni expresiones cálidas.",
    high: "Muy amable y acogedor, sonríe en cada mensaje.",
  },
  seriousness: {
    label: "Seriedad",
    description: "Qué tan formal y sobrio debe sonar en sus respuestas.",
    low: "Habla como si fuera de confianza, muy relajado.",
    high: "Muy profesional, sin bromas ni coloquialismos.",
  },
  empathy: {
    label: "Empatía",
    description:
      "Capacidad de entender y responder a cómo se siente el cliente.",
    low: "Responde sin reconocer emociones del usuario.",
    high: "Leve las emociones, ofrece comprensión y apoyo.",
  },
  confidence: {
    label: "Confianza",
    description: "Seguridad con la que da sus respuestas.",
    low: "Responde con dudas o estilo vacilante.",
    high: "Habla con decisión y convicción, sin dudas.",
  },
  professionalism: {
    label: "Profesionalismo",
    description: "Nivel de lenguaje corporativo y precisión técnica.",
    low: "Muy informal, sin cortesía empresarial.",
    high: "Lenguaje muy pulido, como un asesor experto.",
  },
  patience: {
    label: "Paciencia",
    description: "Disposición del asistente a repetir o explicar de nuevo.",
    low: "Cumple rápido, sin repetir o aclarar.",
    high: "Muy paciente, explica todo con calma.",
  },
  curiosity: {
    label: "Curiosidad",
    description: "Si el asistente hace preguntas para entender mejor.",
    low: "No hace preguntas adicionales.",
    high: "Hace muchas preguntas para conocer mejor al cliente.",
  },
  emojis: {
    label: "Emojis",
    description: "Cuánto usa emojis para hacer sus mensajes más expresivos.",
    low: "No usa emojis.",
    high: "Usa emojis en casi cada mensaje para transmitir emoción.",
  },
} as const;

export function RouteComponent() {
  const { assistantId } = Route.useParams();
  const { organizationId, userId } = Route.useLoaderData();
  const [saved, setSaved] = useState(false);

  const {
    data: [assistantConfiguration],
  } = useSuspenseQuery(
    getAssistantQO({
      type: "assistants",
      query: {
        method: "getAssistants",
        data: {
          id: assistantId,
          withPersonalities: true,
        },
      },
      userData: {
        organizationId,
      },
    })
  );

  const personalitiesId =
    assistantConfiguration.configuration.personalities?.id;
  const personalities = assistantConfiguration.configuration.personalities;

  const getValidPersonalities = (
    personalities: any
  ): FormValues["personalities"] => {
    return {
      friendliness: Number(personalities?.friendliness ?? 3),
      seriousness: Number(personalities?.seriousness ?? 3),
      empathy: Number(personalities?.empathy ?? 3),
      confidence: Number(personalities?.confidence ?? 3),
      professionalism: Number(personalities?.professionalism ?? 3),
      patience: Number(personalities?.patience ?? 3),
      curiosity: Number(personalities?.curiosity ?? 3),
      emojis: Number(personalities?.emojis ?? 1),
    };
  };

  const { control, handleSubmit, watch, formState, reset } =
    useForm<FormValues>({
      defaultValues: {
        personalities: getValidPersonalities(personalities),
      },
    });

  const update = useUpdateAssistantConfigurationMutation({
    onSuccess: () => {
      const currentValues = watch();
      reset(currentValues);
      setSaved(true);
    },
  });

  const watched = watch("personalities");
  const isDirty = Boolean(formState.dirtyFields.personalities);

  useEffect(() => {
    if (isDirty && saved) {
      setSaved(false);
    }
  }, [isDirty, saved]);

  const isButtonDisabled = !isDirty || update.isPending;

  const onSubmit = (values: FormValues) => {
    const dirty = formState.dirtyFields.personalities;
    if (!dirty) return;

    const changed = Object.keys(dirty).reduce<
      Partial<FormValues["personalities"]>
    >((acc, k) => {
      acc[k as keyof FormValues["personalities"]] =
        values.personalities[k as keyof FormValues["personalities"]];
      return acc;
    }, {});

    update.mutate({
      type: "assistants",
      query: {
        method: "updateAssistantConfiguration",
        data: {
          updatePersonalities: { id: personalitiesId!, personalities: changed },
        },
      },
      userData: { organizationId, userId },
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-1 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-md font-semibold text-text-primary">
              Configuración de la personalidad del asistente
            </h2>
            <p className="text-xs text-text-secondary">
              Ajusta cómo se expresa y comporta el asistente en sus
              interacciones.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 min-h-0">
        <form className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto min-h-0 resize-none">
            <div className="flex gap-3 flex-col">
              {(
                Object.keys(personalitiesMap) as Array<
                  keyof typeof personalitiesMap
                >
              ).map((trait) => (
                <div
                  key={trait}
                  className="rounded-md bg-soft-surface flex-col flex p-2 w-full"
                >
                  <p className="text-text-primary text-xs">
                    {personalitiesMap[trait].description}
                  </p>
                  <div className="">
                    <Label className="capitalize text-text-primary">
                      {personalitiesMap[trait].label}
                    </Label>
                    <Controller
                      control={control}
                      name={`personalities.${trait}`}
                      render={({ field }) => (
                        <div className="flex gap-4">
                          <Slider
                            value={[field.value]}
                            onValueChange={(v) => field.onChange(v[0])}
                            step={1}
                            min={0}
                            max={5}
                            className={"flex-1 custom-slider"}
                          />
                          <div className="text-white bg-text-primary w-5 h-5 rounded-full flex items-center justify-center">
                            <p>{watched[trait]}</p>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </div>

      <div className="px-4 py-3 border-t border-border flex-shrink-0">
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isButtonDisabled}
            className="min-w-[120px] bg-text-primary hover:bg-text-primary cursor-pointer"
            onClick={handleSubmit(onSubmit)}
          >
            {update.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}
