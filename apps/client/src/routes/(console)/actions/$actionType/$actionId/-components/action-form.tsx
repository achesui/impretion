import { useForm } from "react-hook-form";
import { useMemo } from "react";
import { Loader2, MoveLeft, X } from "lucide-react";
import actionSchemas from "@/modules/actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ComponentRenderer } from "@/modules/actions/component-renderer";
import { Button } from "@/components/ui/button";
import { useUpsertActionMutation } from "@/services/queries";
import { generateFunctionCall } from "@/lib/generate-function-call";
import ActionSubscription from "./action-subscription";
import { Link, useNavigate } from "@tanstack/react-router";
import { GetActionResultsResponse } from "@core-service/types";
import { UserData } from "@base/shared-types";

// Actualizar tipos para permitir undefined en configuración y estructura
type ActionFormProps = {
  userData: UserData;
  action: GetActionResultsResponse[0]["action"];
  configuration?: GetActionResultsResponse[0]["configuration"];
  structure?: GetActionResultsResponse[0]["structure"];
};

type CurrentActionData = {
  configuration: string[];
  parameters: string[];
};

export function ActionForm({
  action,
  configuration,
  structure,
  userData,
}: ActionFormProps) {
  const { organizationId, userId } = userData;
  const navigate = useNavigate();

  const upsertMutation = useUpsertActionMutation({
    onSuccess: async () => {
      navigate({ to: `/actions/${action.type}` });
    },
  });
  const { id: actionId, type: actionType } = action;

  const isCreating = actionId === "null";

  const actionSchema = actionSchemas[actionType as keyof typeof actionSchemas];

  if (!actionSchema) {
    return <div>Tipo de acción no soportado: {actionType}</div>;
  }

  // Extraer datos de la base de datos si están disponibles
  const dbParameters = structure?.actionSchema?.parameters?.properties ?? {};
  const dbConfiguration = configuration?.configuration ?? {};

  // Determinar qué campos usar basado en el modo (creación vs edición)
  const currentActionData: CurrentActionData = useMemo(() => {
    if (isCreating) {
      // Modo Creación: usar campos por defecto del esquema
      return {
        configuration: actionSchema.defaultContext.configuration,
        parameters: actionSchema.defaultContext.parameters,
      };
    } else {
      // Modo Edición: usar campos que existen en la BD
      return {
        configuration: Object.keys(dbConfiguration),
        parameters: Object.keys(dbParameters),
      };
    }
  }, [isCreating, actionSchema, dbConfiguration, dbParameters]);

  // Calcular valores por defecto para el formulario
  const formDefaultValues = useMemo(() => {
    // Valores por defecto para actionDetails
    const actionDetailsDefaults = (() => {
      if (isCreating) {
        return {
          name: `Nueva acción de ${actionSchema.renderer.metadata.definitions.type}`,
          description: actionSchema.renderer.metadata.definitions.description,
        };
      } else {
        return {
          name:
            structure?.name || actionSchema.renderer.metadata.definitions.type,
          description:
            structure?.description ||
            actionSchema.renderer.metadata.definitions.description,
        };
      }
    })();

    // Valores por defecto para configuration
    const configurationDefaults = currentActionData.configuration.reduce(
      (acc: Record<string, any>, configKey: string) => {
        if (!actionSchema.renderer.configuration[configKey]) {
          console.warn(`Configuration key "${configKey}" not found in schema`);
          return acc;
        }

        if (isCreating) {
          // Modo Creación: usar valor por defecto del esquema
          acc[configKey] =
            actionSchema.renderer.configuration[configKey].defaultValues.value;
        } else {
          // Modo Edición: usar valor de BD o fallback al esquema
          const dbValue = dbConfiguration[configKey]?.value;
          const schemaDefault =
            actionSchema.renderer.configuration[configKey].defaultValues.value;
          acc[configKey] = dbValue !== undefined ? dbValue : schemaDefault;
        }

        return acc;
      },
      {}
    );

    return {
      actionDetails: actionDetailsDefaults,
      configuration: configurationDefaults,
    };
  }, [
    isCreating,
    actionSchema,
    structure,
    dbConfiguration,
    currentActionData.configuration,
  ]);

  // Inicializar formulario con valores calculados
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    getValues,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: formDefaultValues,
    mode: "onChange",
  });

  // Función para preparar datos antes del envío
  const prepareSubmissionData = (formData: any) => {
    const { configuration: formConfig, actionDetails } = formData;

    // Preparar parámetros para la función calling - los enviamos de forma dinamica porque en el futuro nos dara flexibilidad
    // Si se pueden agregar más parametros a funciones.
    const mainParameters =
      actionSchema.renderer.metadata.functionCalling.parameters;

    const extraParameters =
      actionSchema.renderer.metadata.functionCalling.extraParameters;

    const parameters = {
      ...mainParameters,
      ...extraParameters,
    };

    // Preparar configuración con estructura requerida por la BD
    const preparedConfiguration = Object.keys(formConfig).reduce(
      (acc: Record<string, any>, configKey: string) => {
        const schemaConfig = actionSchema.renderer.configuration[configKey];

        if (!schemaConfig) {
          console.warn(`Configuration "${configKey}" not found in schema`);
          return acc;
        }

        acc[configKey] = {
          id: schemaConfig.defaultValues.id,
          value: formConfig[configKey],
        };

        return acc;
      },
      {}
    );

    return {
      actionStructure: {
        parameters,
        name: "appointment",
        description: actionSchema.renderer.metadata.functionCalling.description,
        strict: true,
      },
      configuration: preparedConfiguration,
      name: actionDetails.name,
      description: actionDetails.description,
    };
  };

  // Handler del formulario
  const onSubmit = (formData: any) => {
    const data = prepareSubmissionData(formData);

    upsertMutation.mutate({
      type: "actions",
      query: {
        method: "createOrUpdateAction",
        data: {
          operation: isCreating ? "create" : "update",
          id: actionId,
          values: {
            action: { type: actionType, createdBy: userId, returns: true },
            actionConfiguration: { configuration: data.configuration },
            actionStructure: {
              actionSchema: generateFunctionCall(data.actionStructure),
              name: data.name,
              description: data.description,
            },
          },
        },
      },
      userData: {
        organizationId,
      },
    });
  };

  return (
    <div className="p-3 h-full flex flex-col text-slate-500 border-slate-300 rounded-md overflow-hidden">
      <div className="flex-none border-b border-slate-300 mb-2">
        <Link to={`/actions/$actionType`} params={{ actionType }}>
          <div className="mb-2 rounded-md text-base flex items-center gap-2 w-fit text-slate-600 hover:text-slate-800 transition-colors">
            <MoveLeft size={30} />
            <p>VOLVER</p>
          </div>
        </Link>
      </div>

      {/* Formulario principal */}
      <form
        id="action-form"
        className="flex flex-1 flex-col overflow-hidden gap-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* Campos de detalles de la acción */}
        <div className="flex-none flex gap-4 w-full">
          <label className="flex flex-col w-full">
            <span className="text-sm font-medium mb-1">
              Nombre personalizado para esta acción
            </span>
            <input
              {...register("actionDetails.name", {
                required: "Este campo es requerido",
                minLength: {
                  value: 3,
                  message: "Debe tener mínimo 3 caracteres",
                },
              })}
              placeholder="Un nombre que identifique a esta acción"
              className={`focus:outline-none bg-white placeholder:text-gray-400 rounded-md text-sm p-3 w-full transition-colors ${
                errors.actionDetails?.name
                  ? "border-2 border-red-400 focus:border-red-500"
                  : "border border-slate-300 focus:border-blue-500"
              }`}
            />
            {errors.actionDetails?.name && (
              <span className="text-xs text-red-500 mt-1">
                {errors.actionDetails.name.message}
              </span>
            )}
          </label>

          <label className="flex flex-col w-full">
            <span className="text-sm font-medium mb-1">
              Descripción de la acción
            </span>
            <input
              {...register("actionDetails.description", {
                required: "Este campo es requerido",
                minLength: {
                  value: 3,
                  message: "Debe tener mínimo 3 caracteres",
                },
              })}
              placeholder="Una descripción para esta acción"
              className={`text-sm focus:outline-none bg-white placeholder:text-gray-400 rounded-md p-3 w-full transition-colors ${
                errors.actionDetails?.description
                  ? "border-2 border-red-400 focus:border-red-500"
                  : "border border-slate-300 focus:border-blue-500"
              }`}
            />
            {errors.actionDetails?.description && (
              <span className="text-xs text-red-500 mt-1">
                {errors.actionDetails.description.message}
              </span>
            )}
          </label>
        </div>

        {/* Contenedor principal de columnas */}
        <div className="flex flex-1 gap-4 overflow-hidden">
          {/* Columna de Parámetros */}
          <div className="flex flex-1 flex-col">
            <div className="text-sm text-slate-600 flex items-center"></div>

            <ScrollArea className="h-full bg-white border border-slate-300 rounded-lg w-full overflow-hidden">
              <div className="p-4 space-y-3">
                {currentActionData.parameters.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p>No hay parámetros configurados</p>
                  </div>
                ) : (
                  currentActionData.parameters.map((paramKey: string) => {
                    const paramSchema =
                      actionSchema.renderer.parameters[paramKey];

                    if (!paramSchema) {
                      return null;
                    }

                    return (
                      <div
                        key={paramKey}
                        className="border border-slate-200 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-slate-700">
                              {paramSchema.label}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                              {paramSchema.description}
                            </p>
                            {paramSchema.optional && (
                              <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                Opcional
                              </span>
                            )}
                          </div>
                          {paramSchema.optional && (
                            <button
                              type="button"
                              className="ml-2 p-1 text-slate-400 hover:text-red-500 transition-colors"
                              onClick={() => {
                                // Lógica para remover parámetro opcional
                              }}
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Columna de Configuración */}
          <div className="flex flex-1 flex-col">
            <div className="text-sm text-slate-600 flex items-center"></div>

            <ScrollArea className="h-full bg-white border border-slate-300 rounded-lg w-full overflow-hidden">
              <div className="p-4 space-y-3">
                {currentActionData.configuration.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p>No hay configuración disponible</p>
                  </div>
                ) : (
                  currentActionData.configuration.map((configKey: string) => {
                    const configSchema =
                      actionSchema.renderer.configuration[configKey];

                    if (!configSchema) {
                      return null;
                    }

                    return (
                      <div
                        key={configKey}
                        className="border border-slate-200 p-3 rounded-lg"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="font-medium text-slate-700">
                              {configSchema.label}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                              {configSchema.description}
                            </p>
                          </div>
                          {configSchema.optional && (
                            <button
                              type="button"
                              className="ml-2 p-1 text-slate-400 hover:text-red-500 transition-colors"
                              onClick={() => {
                                // Lógica para remover configuración opcional
                              }}
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        {/* Renderizado del componente de configuración */}
                        <ComponentRenderer
                          componentName={configSchema.component}
                          props={{
                            setValue,
                            register,
                            control,
                            errors,
                            value: formDefaultValues.configuration[configKey],
                            clearErrors,
                            watch,
                            getValues,
                            actionId: actionId,
                            userData,
                          }}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </form>
      {/* Footer con botón de guardar */}
      <div className="flex-none flex items-center justify-between mt-3 border-slate-200">
        <Button
          type="submit"
          form="action-form"
          disabled={isSubmitting}
          className={`min-w-[120px] text-white bg-text-primary hover:bg-text-primary/90 transition-all duration-200 ${
            isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:shadow-md"
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span>{isCreating ? "Guardando" : "Actualizando"}</span>
            </div>
          ) : (
            <span>{isCreating ? "Crear Acción" : "Actualizar Acción"}</span>
          )}
        </Button>

        {actionId !== "null" && (
          <div
            className={`transition-opacity duration-200 ${isSubmitting ? "opacity-50 pointer-events-none" : ""}`}
          >
            <ActionSubscription userData={userData} actionId={actionId} />
          </div>
        )}
      </div>
    </div>
  );
}
