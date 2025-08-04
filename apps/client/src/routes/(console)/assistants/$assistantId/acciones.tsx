import { authUserData } from "@/lib/auth-handler";
import actionSchemas from "@/modules/actions";
import {
  getActionsQO,
  getAssistantQO,
  useCreateOrDeleteLinkedActionMutation,
} from "@/services/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, X, Loader2 } from "lucide-react";

export const Route = createFileRoute(
  "/(console)/assistants/$assistantId/acciones"
)({
  loader: async ({ context: { queryClient, auth }, params }) => {
    const userData = await authUserData(auth);

    const { assistantId } = params;
    await queryClient.ensureQueryData(
      getAssistantQO({
        type: "assistants",
        query: {
          method: "getAssistants",
          data: {
            id: assistantId,
            withLinkedCollections: true,
          },
        },
        userData,
      })
    );

    return { assistantId, userData };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { userData, assistantId } = Route.useLoaderData();

  const {
    data: [assistant],
  } = useSuspenseQuery(
    getAssistantQO({
      type: "assistants",
      query: {
        method: "getAssistants",
        data: {
          id: assistantId,
          withLinkedActions: true,
        },
      },
      userData,
    })
  );

  const { linkedActions } = assistant;

  const createOrDeleteLinkedActionMutation =
    useCreateOrDeleteLinkedActionMutation({
      onSuccess: () => {},
      onError: (error) => {
        console.error("Error al guardar la conexión en base de datos:", error);
      },
    });

  const { data: currentActions } = useSuspenseQuery(
    getActionsQO({
      type: "actions",
      query: {
        method: "getActions",
        data: {},
      },
      userData,
    })
  );

  // Obtener los tipos de acciones ya enlazadas
  const linkedActionTypes =
    linkedActions?.map(({ action }) => action.type) || [];

  // Filtrar las acciones disponibles excluyendo los tipos ya enlazados
  const availableActions =
    currentActions?.filter(
      ({ action }) => !linkedActionTypes.includes(action.type)
    ) || [];

  const assignNewAction = (actionId: string, actionType: string) => {
    createOrDeleteLinkedActionMutation.mutate({
      type: "assistants",
      query: {
        method: "updateAssistantActions",
        data: {
          operation: "create",
          values: {
            actionType,
            actionId,
            assistantId,
          },
        },
      },
      userData,
    });
  };

  const removeAction = (actionId: string) => {
    createOrDeleteLinkedActionMutation.mutate({
      type: "assistants",
      query: {
        method: "updateAssistantActions",
        data: {
          operation: "delete",
          id: actionId,
        },
      },
      userData,
    });
  };

  return (
    <div className="p-4 flex w-full h-full gap-4">
      <div className="w-full border rounded-md relative">
        {/* Loader para la sección de acciones asignadas */}
        {createOrDeleteLinkedActionMutation.isPending && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-md">
            <Loader2 className="h-8 w-8 animate-spin text-text-primary" />
          </div>
        )}

        <div className="p-1 border-b border-border">
          <p className="text-text-primary font-semibold text-md">
            Acciones asignadas
          </p>
          <p className="text-xs text-text-secondary">
            Estas son las acciones asignadas a este asistente.
          </p>
        </div>
        <div className="flex gap-2 flex-col p-2">
          {linkedActions && linkedActions.length > 0 ? (
            linkedActions.map(({ action, linkedActionId }) => (
              <div className="" key={linkedActionId}>
                <div className="flex justify-between border-border border rounded-md">
                  <div className="p-2 text-text-primary">
                    <p className="font-semibold">{action.structure?.name}</p>
                    <p>{action.structure?.description}</p>
                  </div>
                  <div className="cursor-pointer hover:bg-red-50 flex p-2 border-l border-border">
                    <button
                      className="cursor-pointer"
                      onClick={() => removeAction(linkedActionId)}
                      disabled={createOrDeleteLinkedActionMutation.isPending}
                    >
                      <X className="text-red-400 cursor-pointer" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-text-primary font-semibold h-full flex items-center justify-center">
              <p>Este asistente no tiene ninguna acción enlazada.</p>
            </div>
          )}
        </div>
      </div>

      <div className="w-full border h-full rounded-md relative">
        {/* Loader para la sección de acciones disponibles */}
        {createOrDeleteLinkedActionMutation.isPending && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-md">
            <Loader2 className="h-8 w-8 animate-spin text-text-primary" />
          </div>
        )}

        <div className="p-1 border-b border-border">
          <p className="text-text-primary font-semibold text-md">
            Acciones creadas
          </p>
          <p className="text-xs text-text-secondary">
            Estas son las acciones que puedes asignar a este asistente.
          </p>
        </div>
        {availableActions && availableActions.length > 0 ? (
          <div className="p-2 rounded-md flex gap-2 flex-col">
            {availableActions.map(({ action }) => {
              const schema =
                actionSchemas[action.type as keyof typeof actionSchemas];
              const definitions = schema.renderer.metadata.definitions;

              return (
                <div
                  className="flex border-border border rounded-md"
                  key={action.id}
                >
                  <button
                    className="px-3 border-r border-border hover:bg-soft-surface hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => assignNewAction(action.id, action.type)}
                    disabled={createOrDeleteLinkedActionMutation.isPending}
                  >
                    <ArrowLeft className="text-text-primary" />
                  </button>
                  <div className="p-2">
                    <p className="font-semibold text-text-primary">
                      {definitions.type}
                    </p>
                    <p className="text-text-secondary">
                      {definitions.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-2 h-full">
            {currentActions && currentActions.length > 0 ? (
              <div className="h-full flex justify-center items-center flex-col">
                <p className="text-text-primary font-medium text-center">
                  No hay acciones disponibles para asignar
                </p>
                <p className="text-text-secondary text-sm text-center mt-2 max-w-md">
                  Este asistente ya tiene todas las acciones permitidas. Cada
                  asistente solo puede tener una acción de cada tipo.
                </p>
              </div>
            ) : (
              <div className="flex justify-center font-semibold text-sm text-text-primary">
                <p>Aún no has creado ninguna acción.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
