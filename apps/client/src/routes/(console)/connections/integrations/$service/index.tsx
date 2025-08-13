import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getUserDataQO } from "@/services/queries";
import { authUserData } from "@/lib/auth-handler";
import UniversalAuthComponent from "./-auth-component";

export const Route = createFileRoute(
  "/(console)/connections/integrations/$service/",
)({
  loader: async ({ context: { auth }, params: { service } }) => {
    const userData = await authUserData(auth);

    return {
      userData,
      service,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { userData } = Route.useLoaderData();
  const { service } = Route.useParams();

  console.log("SERVICIO => ", service);
  const { data: user } = useSuspenseQuery(
    getUserDataQO({
      type: "users",
      query: {
        method: "getUserData",
        data: {
          withIntegrations: true,
          service,
        },
      },
      userData,
    }),
  );

  const { integrations } = user;

  // Garantizar que siempre es un array
  const [currentIntegration] = integrations ?? [];

  console.log("currentIntegration => ", currentIntegration);

  return (
    <div>
      <UniversalAuthComponent
        serviceName={service || ""}
        currentIntegration={currentIntegration}
        userData={userData}
      />
    </div>
  );
}
