import { getActionsQO } from "@/services/queries";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ActionForm } from "./-components/action-form";
import { authUserData } from "@/lib/auth-handler";

export const Route = createFileRoute(
  "/(console)/actions/$actionType/$actionId/"
)({
  loader: async ({ context: { auth, queryClient }, params }) => {
    const { actionId, actionType } = params;
    const userData = await authUserData(auth);

    // Solo precargar si actionId no es "null"
    if (actionId !== "null") {
      queryClient.ensureQueryData(
        getActionsQO({
          type: "actions",
          query: {
            method: "getActions",
            data: {
              actionId,
              type: actionType,
              withConfiguration: true,
              withStructure: true,
            },
          },
          userData,
        })
      );
    }

    return { userData };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { userData } = Route.useLoaderData();
  const { actionType, actionId } = Route.useParams();

  // useQuery con enabled - se ejecuta condicionalmente
  const { data: actionData } = useQuery({
    ...getActionsQO({
      type: "actions",
      query: {
        method: "getActions",
        data: {
          actionId: actionId,
          type: actionType,
          withConfiguration: true,
          withStructure: true,
        },
      },
      userData,
    }),
    enabled: actionId !== "null", // Solo ejecuta si actionId no es "null"
  });

  // Preparar datos para ambos casos: creación y edición
  let action, configuration, structure;

  if (actionId === "null") {
    // Modo creación: crear objetos mock con valores mínimos requeridos
    action = {
      id: "null",
      type: actionType,
      returns: true,
      createdAt: new Date(),
      createdBy: userData.userId || null,
      organizationId: userData.organizationId || "",
    };
    configuration = undefined;
    structure = undefined;
  } else {
    // Modo edición: verificar que los datos existan
    if (!actionData || !actionData[0]) {
      throw new Error("Action not found");
    }

    const actionItem = actionData[0];
    action = actionItem.action;
    configuration = actionItem.configuration;
    structure = actionItem.structure;
  }

  return (
    <ActionForm
      action={action}
      configuration={configuration}
      structure={structure}
      userData={userData}
    />
  );
}
