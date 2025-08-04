import { getConnectionsQO } from "@/services/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { NewDirectConnection } from "./-components/new-direct-connection";
import ConnectionSuccess from "./-components/steps/connection-success";
import { authUserData } from "@/lib/auth-handler";
import { useState } from "react";
import { useRemoveConnectionMutation } from "@/services/queries";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/(console)/connections/direct/")({
  loader: async ({ context: { queryClient, auth } }) => {
    const { organizationId, userId } = await authUserData(auth);

    await queryClient.ensureQueryData(
      getConnectionsQO({
        type: "connections",
        query: {
          method: "getConnections",
          data: {},
        },
        userData: {
          organizationId,
          userId,
        },
      })
    );

    return {
      organizationId,
      userId,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { organizationId, userId } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    data: [directConnection],
  } = useSuspenseQuery(
    getConnectionsQO({
      type: "connections",
      query: {
        method: "getConnections",
        data: {
          type: "direct",
        },
      },
      userData: {
        organizationId,
        userId,
      },
    })
  );

  // Hook para eliminar la conexión desde la vista de éxito independiente
  const removeConnectionMutation = useRemoveConnectionMutation({
    onSuccess: async () => {
      // Invalidación de cache para refrescar los datos
      await queryClient.invalidateQueries({
        queryKey: ["connection"],
      });
      setShowSuccess(false);
    },
    onError: (error) => {
      console.error("Error al eliminar la conexión:", error);
    },
  });

  const handleRemoveConnection = () => {
    if (!directConnection?.id) {
      console.error("No se puede eliminar la conexión: ID no encontrado");
      return;
    }

    removeConnectionMutation.mutate({
      type: "connections",
      query: {
        method: "removeConnection",
        data: {
          type: "direct",
          id: directConnection.id,
        },
      },
      userData: {
        organizationId,
      },
    });
  };

  const handleConnectionSuccess = () => {
    setShowSuccess(true);
  };

  const handleConnectionRemoved = () => {
    setShowSuccess(false);
  };

  if (!userId) throw Error("Usuario no autenticado");

  // Si hay una conexión existente y no estamos mostrando success temporal
  if (directConnection && !showSuccess) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <ConnectionSuccess
          phoneNumber={directConnection.connectedWith}
          removeConnectionMutation={removeConnectionMutation}
          onRemoveConnection={handleRemoveConnection}
          isLoading={removeConnectionMutation.isPending}
        />
      </div>
    );
  }

  // Si no hay conexión o estamos en proceso de crear una nueva
  return (
    <NewDirectConnection
      organizationId={organizationId}
      userId={userId}
      connectionId={directConnection?.id}
      onConnectionSuccess={handleConnectionSuccess}
      onConnectionRemoved={handleConnectionRemoved}
    />
  );
}
