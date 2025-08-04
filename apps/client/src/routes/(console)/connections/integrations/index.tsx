import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getUserDataQO } from "@/services/queries";
import { authUserData } from "@/lib/auth-handler";
import calendlyLogo from "../../../../assets/logos/calendly.svg";

export const Route = createFileRoute("/(console)/connections/integrations/")({
  loader: async ({ context: { auth } }) => {
    const userData = await authUserData(auth);

    return { userData };
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
        },
      },
      userData,
    })
  );

  const { integrations: userIntegrations } = user;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Integraciones</h1>
        <p className="text-text-primary">
          Coencta herramientas terceras para sincronizar tus datos con los
          asistentes facilmente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => {
          // Buscar si el usuario ya tiene esta integración conectada
          const isConnected = userIntegrations?.find(
            (userIntegration) => userIntegration.service === integration.service
          );

          return (
            <Link
              key={integration.service}
              to={`/connections/integrations/${integration.route}` as any}
              className="hover:shadow-sm rounded-xl shadow-soft-surface"
            >
              <div className="border border-gray-200 rounded-xl p-6 shadow-sm bg-white h-32 flex items-center justify-between hover:border-gray-300 transition-colors">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    <img
                      className="w-12 h-12 rounded-lg shadow-sm"
                      src={integration.logo}
                      alt={`${integration.name} logo`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-text-primary mb-1">
                      {integration.name}
                    </h3>

                    {isConnected ? (
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <span className="text-sm flex items-center gap-2 font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Conectado
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm text-text-primary">
                          Conecta tu cuenta de {integration.name}
                        </p>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs bg-component text-white px-2 py-1 rounded-full font-medium">
                            Disponible
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 ml-4">
                  {isConnected ? (
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full group-hover:bg-blue-100 transition-colors">
                      <svg
                        className="w-5 h-5 text-gray-500 group-hover:text-blue-600 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        ></path>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const integrations = [
  {
    service: "calendly",
    route: "calendly",
    name: "Calendly",
    logo: calendlyLogo,
  },
  // Ejemplo de más integraciones que puedes añadir:
  // {
  //   service: "slack",
  //   route: "slack",
  //   name: "Slack",
  //   logo: slackLogo,
  // },
  // {
  //   service: "zoom",
  //   route: "zoom",
  //   name: "Zoom",
  //   logo: zoomLogo,
  // }
];
