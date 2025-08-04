import { createFileRoute } from "@tanstack/react-router";
import CalendlyAuth from "./-calendly-auth";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getUserDataQO } from "@/services/queries";
import { authUserData } from "@/lib/auth-handler";

export const Route = createFileRoute(
  "/(console)/connections/integrations/calendly/"
)({
  loader: async ({ context: { auth } }) => {
    const userData = await authUserData(auth);

    return {
      userData,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { userData } = Route.useLoaderData();

  const { data: user } = useSuspenseQuery(
    getUserDataQO({
      type: "users",
      query: {
        method: "getUserData",
        data: {
          withIntegrations: true,
          service: "calendly",
        },
      },
      userData,
    })
  );

  const { integrations } = user;

  // Garantizar que siempre es un array
  const currentIntegration = integrations ?? [];

  return (
    <div>
      <CalendlyAuth
        currentIntegration={currentIntegration}
        userData={userData}
      />
    </div>
  );
}
