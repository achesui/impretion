import { NewDialog } from "@/components/customized/new-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  getConnectionsQO,
  useUpsertConnectionMutation,
} from "@/services/queries";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { AlertCircle, CheckCircle2, Wifi } from "lucide-react";
import type { UserData } from "../../../../../../../../global";

interface FormData {
  isConnected: boolean;
}

interface ActionSubscriptionProps {
  userData: UserData;
  actionId: string;
}

export default function ActionSubscription({
  userData,
  actionId,
}: ActionSubscriptionProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Queries y mutations
  const { data: connections, isLoading } = useQuery({
    ...getConnectionsQO({
      type: "connections",
      query: { method: "getConnections", data: { withSubscriptions: true } },
      userData,
    }),
    enabled: isOpen,
  });

  const mutation = useUpsertConnectionMutation();

  // Estados derivados
  const directConnection = connections?.[0] ?? null;
  const isSubscribed =
    directConnection?.subscriptions?.some(
      (subscription) => subscription.actionId === actionId
    ) ?? false;

  // Form setup
  const form = useForm<FormData>({
    defaultValues: { isConnected: false },
  });

  const { control, handleSubmit, formState, reset } = form;

  // Sincronizar form con datos del servidor cuando cambien
  useEffect(() => {
    if (directConnection !== null) {
      reset({ isConnected: isSubscribed });
    }
  }, [directConnection, isSubscribed, reset]);

  const isConnected = useWatch({
    control,
    name: "isConnected",
    defaultValue: false,
  });

  // Handlers
  const onSubmit = async (data: FormData) => {
    if (!directConnection) return;

    const { isConnected } = data;

    mutation.mutate({
      type: "connections",
      query: {
        method: isConnected
          ? "createConnectionSubscription"
          : "removeConnectionSubscription",
        data: {
          connectionId: directConnection.id,
          actionId,
        },
      },
      userData,
    });
  };

  // Reset form cuando se abre/cierra el modal
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && directConnection) {
      // Reset al estado del servidor cuando se cierra sin guardar
      reset({ isConnected: isSubscribed });
    }
  };

  // Render helpers
  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-text-primary"></div>
      <p className="text-sm text-gray-600">Cargando conexión...</p>
    </div>
  );

  const renderNoConnectionState = () => (
    <div className="space-y-6">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-amber-800">
              Sin conexión directa
            </h4>
            <p className="text-sm text-amber-700 leading-relaxed">
              Para suscribirte a esta acción, primero debes establecer una
              conexión directa desde{" "}
              <span className="font-medium text-text-primary">
                Conexiones → Conexión Directa
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wifi className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-500">
              Conectarse a esta acción
            </span>
          </div>
          <Switch checked={false} disabled />
        </div>
        <p className="text-xs text-gray-500 mt-2 ml-8">
          Disponible una vez establecida la conexión directa
        </p>
      </div>
    </div>
  );

  const renderConnectedState = () => (
    <div className="space-y-6">
      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-700">
            Conectado con el número{" "}
            <span className="font-semibold font-mono">
              {directConnection?.connectedWith}
            </span>
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Wifi
                className={`h-5 w-5 ${isConnected ? "text-green-600" : "text-gray-400"}`}
              />
              <span className="text-sm font-medium text-text-primary">
                Suscripción a esta acción
              </span>
            </div>
            <p className="text-xs text-text-primary ml-8">
              {isConnected
                ? "Recibirás notificaciones de esta acción"
                : "Activa para recibir notificaciones"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isConnected && (
              <span className="text-xs font-medium text-green-900 bg-green-200 px-2 py-1 rounded-full">
                Conectado
              </span>
            )}
            <Controller
              name="isConnected"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderModalBody = () => {
    if (isLoading) return renderLoadingState();
    if (!directConnection) return renderNoConnectionState();
    return renderConnectedState();
  };

  const isProcessing = formState.isSubmitting || mutation.isPending;

  return (
    <NewDialog
      isOpen={isOpen}
      trigger={
        <Button className="bg-text-primary hover:bg-text-primary/90 text-white font-medium">
          Suscribirse
        </Button>
      }
      title="Suscripción a Acción"
      onOpenChange={handleOpenChange}
      form={form}
      onSubmit={handleSubmit(onSubmit)}
      saveBtnText="Guardar Configuración"
      disableSave={!directConnection}
      isLoading={isProcessing}
    >
      <div className="space-y-1">
        <p className="text-sm text-gray-600 mb-6">
          Configura tu suscripción para recibir notificaciones de esta acción.
        </p>
        {renderModalBody()}
      </div>
    </NewDialog>
  );
}
