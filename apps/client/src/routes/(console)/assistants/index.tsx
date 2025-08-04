import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getAssistantQO } from "@/services/queries";
import { authUserData } from "@/lib/auth-handler";
import { Bot } from "lucide-react";

export const Route = createFileRoute("/(console)/assistants/")({
  loader: async ({ context: { queryClient, auth } }) => {
    const { organizationId } = await authUserData(auth);

    await queryClient.ensureQueryData(
      getAssistantQO({
        type: "assistants",
        query: {
          method: "getAssistants",
          data: {},
        },
        userData: {
          organizationId,
        },
      })
    );

    return {
      organizationId,
    };
  },
  component: AssistantsPage,
});

function AssistantsPage() {
  const { organizationId } = Route.useLoaderData();

  const { data: assistants } = useSuspenseQuery(
    getAssistantQO({
      type: "assistants",
      query: {
        method: "getAssistants",
        data: {},
      },
      userData: {
        organizationId,
      },
    })
  );

  // Si no hay datos (pero la query ya se resolvió)
  if (!assistants || assistants.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-4m-4 0H9m-4 0H4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No hay asistentes
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Comienza creando tu primer asistente.
          </p>
        </div>
      </div>
    );
  }

  // Renderizar los datos con contenedor scrolleable
  return (
    <div className="h-full flex flex-col">
      {/* Header fijo - no scrollea */}
      <div className="p-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-md font-semibold text-text-primary">
              Asistentes
            </h1>
            <p className="text-sm text-text-secondary">
              Los asistentes de inteligencia artificial te ayudan a gestionar
              tareas específicas, haciendo que las actividades de tu empresa
              sean más fáciles y eficientes.
            </p>
          </div>
        </div>
      </div>

      {/* Contenido scrolleable - toma el resto de la altura */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Lista de asistentes */}
          <div className="bg-white border border-border overflow-hidden sm:rounded-md">
            <ul className="border-border">
              {assistants.map((assistant) => (
                <li key={assistant.id}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                            <Bot color="#fff" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {assistant.name}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {assistant.description}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        to="/assistants/$assistantId/prompt"
                        params={{ assistantId: assistant.id }}
                        className="inline-flex items-center px-3 py-2 border border-border text-sm leading-4 font-medium rounded-md text-text-primary bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Ver Detalles
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
