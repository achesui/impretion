import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  getConnectionsQO,
  getAssistantQO,
} from "../../../../../services/queries";
import { authUserData } from "@/lib/auth-handler";
import { ArrowLeft, Phone, Bot, Calendar, InfoIcon } from "lucide-react";

export const Route = createFileRoute(
  "/(console)/connections/organizational/whatsapp/",
)({
  loader: async ({ context: { queryClient, auth } }) => {
    const userData = await authUserData(auth);

    // Primero obtenemos las conexiones
    const connections = await queryClient.ensureQueryData(
      getConnectionsQO({
        type: "connections",
        query: {
          method: "getConnections",
          data: {
            type: "organizational",
            withSubscriptions: true,
          },
        },
        userData,
      }),
    );

    // Extraemos todos los assistantIds únicos de las subscriptions
    const assistantIds = connections
      .flatMap((connection) => connection.subscriptions || [])
      .map((subscription) => subscription.assistantId)
      .filter(Boolean)
      .filter((id, index, arr) => arr.indexOf(id) === index); // Eliminar duplicados

    // Prefetch de todos los asistentes necesarios
    await Promise.all(
      assistantIds.map((assistantId) =>
        queryClient.ensureQueryData(
          getAssistantQO({
            type: "assistants",
            query: {
              method: "getAssistants",
              data: {
                id: assistantId,
              },
            },
            userData,
          }),
        ),
      ),
    );

    return { userData };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { userData } = Route.useLoaderData();

  const { data: currentConnections } = useSuspenseQuery(
    getConnectionsQO({
      type: "connections",
      query: {
        method: "getConnections",
        data: {
          type: "organizational",
          withSubscriptions: true,
        },
      },
      userData,
    }),
  );

  // Obtener datos de asistentes (ya están en cache por el prefetch)
  const assistantIds = currentConnections
    .flatMap((connection) => connection.subscriptions || [])
    .map((subscription) => subscription.assistantId)
    .filter(Boolean)
    .filter((id, index, arr) => arr.indexOf(id) === index);

  const assistantQueries = assistantIds.map((assistantId) =>
    useSuspenseQuery(
      getAssistantQO({
        type: "assistants",
        query: {
          method: "getAssistants",
          data: {
            id: assistantId,
          },
        },
        userData,
      }),
    ),
  );

  // Crear mapa de asistentes para fácil acceso
  const assistantsMap = assistantQueries.reduce(
    (acc, query, index) => {
      const assistantId = assistantIds[index];
      if (assistantId) {
        acc[assistantId] = query.data;
      }
      return acc;
    },
    {} as Record<string, any>,
  );

  const formatDate = (dateString: any) => {
    return new Date(dateString).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Bogota",
    });
  };

  return (
    <div className="p-4 flex gap-2 flex-col">
      <div className="flex items-center gap-2">
        <Link
          to="/connections/organizational"
          className="w-fit px-3 py-2 rounded-md text-white bg-text-primary hover:bg-text-primary cursor-pointer flex gap-2 items-center"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
          <p>Volver</p>
        </Link>
        <Link to="/connections/organizational/whatsapp/create">
          <div className="text-white bg-[#075e54] font-semibold border-border flex w-fit px-7 gap-2 border py-2 rounded-md">
            Conectar número
          </div>
        </Link>
      </div>

      <div className="bg-soft-surface flex items-center gap-1 p-1 text-text-primary rounded-md overflow-hidden border-border border">
        <InfoIcon size={14} />
        <p className="text-sm">
          Una vez un número este conectado los mensajes entrantes seran
          recibidos por el asistente asignado al número.
        </p>
      </div>

      {currentConnections.length > 0 ? (
        <div className="space-y-3">
          {currentConnections.map((connection, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              {/* Header de la conexión */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#075e54] rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary text-lg">
                      {connection.connectedWith}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>Conectado: {formatDate(connection.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    Conexión establecida
                  </span>
                </div>
              </div>

              {/* Divisor */}
              <div className="border-t border-gray-100 my-3"></div>

              {/* Sección de asistentes */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <Bot className="w-4 h-4 text-text-primary" />
                  Asistente configurado para este número
                </h4>

                {connection.subscriptions &&
                connection.subscriptions.length > 0 ? (
                  <div className="space-y-2">
                    {connection.subscriptions.map((subscription, subIndex) => {
                      const [assistant] = subscription.assistantId
                        ? assistantsMap[subscription.assistantId]
                        : null;

                      return (
                        <div
                          key={subIndex}
                          className="bg-gray-50 rounded-md p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Bot className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-text-primary">
                                  {assistant ? assistant.name : "Sin asistente"}
                                </p>
                                {assistant && (
                                  <p className="text-xs text-text-secondary">
                                    {assistant.description || "Sin descripción"}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {assistant && (
                                <div className="flex items-center gap-2 flex-col">
                                  <div
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      assistant.status === "active"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {assistant.status === "active"
                                      ? "Activo"
                                      : "Inactivo"}
                                  </div>
                                  <p className="text-xs text-text-secondary">
                                    {assistant.isPublic ? "Público" : "Privado"}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800">
                      No hay asistentes configurados para esta conexión
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg">
            No tienes ningún número de WhatsApp Business conectado
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Conecta tu primer número para comenzar a usar los asistentes
          </p>
        </div>
      )}
    </div>
  );
}
