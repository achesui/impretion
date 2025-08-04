import { authUserData } from "@/lib/auth-handler";
import actionSchemas from "@/modules/actions";
import { getActionsQO } from "@/services/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusCircle } from "lucide-react";

export const Route = createFileRoute("/(console)/actions/$actionType/")({
  loader: async ({ context: { queryClient, auth }, params }) => {
    const userData = await authUserData(auth);

    const { actionType } = params;

    await queryClient.ensureQueryData(
      getActionsQO({
        type: "actions",
        query: {
          method: "getActions",
          data: {
            type: actionType,
            withStructure: true,
          },
        },
        userData,
      })
    );

    return { userData };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { userData } = Route.useLoaderData();
  const { actionType } = Route.useParams();

  const { data: actions } = useSuspenseQuery(
    getActionsQO({
      type: "actions",
      query: {
        method: "getActions",
        data: { type: actionType, withStructure: true },
      },
      userData,
    })
  );

  const actionDetails = actionSchemas[actionType as keyof typeof actionSchemas];

  return (
    <div className="h-full p-4">
      <div className="flex gap-2 bg-text-primary w-fit p-2 rounded-md text-white font-semibold px-6">
        <PlusCircle />
        <Link
          to="/actions/$actionType/$actionId"
          params={{ actionType, actionId: "null" }}
        >
          {actionDetails.renderer.metadata.definitions["newActionButton"]}
        </Link>
      </div>
      <div className="border border-b border-border mt-4"></div>
      {actions.length ? (
        actions.map(
          ({ action, structure }: { action: any; structure: any }) => (
            <div
              key={action.id}
              className="bg-soft-surface border border-border text-text-primary mt-4 p-4 rounded-md"
            >
              <Link
                to="/actions/$actionType/$actionId"
                params={{ actionId: action.id, actionType }}
              >
                <p className="font-semibold">
                  {actionDetails.renderer.metadata.definitions.type}
                </p>
                <p className="text-sm">{structure?.name}</p>
                <p className="text-sm">{structure?.description}</p>
              </Link>
            </div>
          )
        )
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-text-primary">
            Aún no has creado ninguna acción de{" "}
            <span className="font-semibold">
              {actionDetails.renderer.metadata.definitions.type}
            </span>
            .
          </p>
        </div>
      )}
    </div>
  );
}
