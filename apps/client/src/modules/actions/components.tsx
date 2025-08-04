"use client";
import { NewDatePicker } from "@/components/customized/new-date-picker";
import { NewDialog } from "@/components/customized/new-dialog";
import NewHourPicker from "@/components/customized/new-hour-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getUserDataQO } from "@/services/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { TriangleAlert, Unplug } from "lucide-react";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { ComponentProps } from "./component-props";
//import CalendlyAuth from "@/components/logins/calendly-auth";

export const TimeZone = ({ register }: any) => {
  return (
    <Input
      className="focus:outline-none text-slate-500 rounded-md text-sm p-2 w-full"
      {...register("configuration.timeZone")}
      value={"America/Bogotá"}
      disabled // El campo no es editable por el usuario
    />
  );
};

export const Schedule = ({
  value,
  setValue,
  clearErrors,
  isSubmitted,
  control,
  errors,
}: any) => {
  const dayMap: Record<string, string> = {
    sunday: "Domingo",
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miercoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sábado",
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {errors?.schedule && (
        <span className="text-xs text-red-400">Este campo es requerido</span>
      )}

      <div className="flex flex-col gap-4 mt-4 h-full overflow-y-auto">
        {[
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ].map((day: string) => (
          <div key={day} className="flex flex-col w-full items-start">
            <p className="w-full text-sm font-semibold">{dayMap[day]}</p>
            <div className="w-full flex items-center gap-2 mt-2">
              <Controller
                control={control}
                name={`configuration.schedule.${day}.isEnabled`}
                defaultValue={value[day].isEnabled}
                render={({ field: { onChange, value } }) => (
                  <Switch checked={value} onCheckedChange={onChange} />
                )}
              />

              <div className="flex gap-2 w-full">
                <Controller
                  control={control}
                  name={`configuration.schedule.${day}.startTime`}
                  defaultValue={value[day].startTime}
                  render={({ field: { onChange, value } }) => (
                    <NewHourPicker
                      value={value}
                      onChange={onChange}
                      placeholder="Hora de inicio"
                      setValue={setValue}
                      name="startTime"
                      clearErrors={clearErrors}
                      isSubmitted={isSubmitted}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`configuration.schedule.${day}.endTime`}
                  defaultValue={value[day].endTime}
                  render={({ field: { onChange, value } }) => (
                    <NewHourPicker
                      value={value}
                      onChange={onChange}
                      placeholder="Hora de fin"
                      setValue={setValue}
                      name="endTime"
                      clearErrors={clearErrors}
                      isSubmitted={isSubmitted}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const StartDate = ({ control, value, errors }: any) => (
  <>
    <Controller
      control={control}
      name="configuration.startDate"
      defaultValue={value.value}
      render={({ field: { onChange } }) => (
        <NewDatePicker
          value={value.value}
          onChange={onChange}
          isBefore={true}
        />
      )}
    />
    {errors.configuration?.startDate && (
      <span>{errors.configuration?.startDate?.message}</span>
    )}
  </>
);

export const MaxAppointmentsPerDay = ({
  value,
  errors,
  control,
  clearErrors,
}: any) => {
  const [isAutoEnabled, setIsAutoEnabled] = useState(value.value.isAuto);
  return (
    <div className="flex flex-col gap-3 bg-white rounded-lg">
      {!isAutoEnabled && errors.configuration?.maxAppointmentsPerDay && (
        <span className="text-xs text-red-500 font-medium">
          Este campo es requerido y debe ser un número mayor a 3.
        </span>
      )}

      <Controller
        control={control}
        name="configuration.maxAppointmentsPerDay.value"
        defaultValue={value.value}
        rules={{
          required: !isAutoEnabled,
          min: !isAutoEnabled ? 3 : undefined,
          validate: (value) => {
            if (isAutoEnabled) return true;
            return value >= 3;
          },
        }}
        render={({ field: { onChange, value: inputValue } }) => (
          <>
            <Input
              className={`focus:outline-none placeholder:text-gray-400 rounded-md text-sm p-2 w-full ${
                !isAutoEnabled && errors.configuration?.maxAppointmentsPerDay
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
              placeholder="Cantidad máxima de citas por día"
              type="number"
              min={3}
              value={inputValue || ""}
              disabled={isAutoEnabled}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value) : "";
                onChange(val);
              }}
            />
          </>
        )}
      />

      <Controller
        control={control}
        name="configuration.maxAppointmentsPerDay.isAuto"
        defaultValue={value.value.isAuto}
        render={({ field: { onChange, value: isAuto } }) => (
          <div className="flex items-center justify-between p-3 rounded-md">
            <div>
              <p className="text-sm font-medium">Auto</p>
              <p className="text-xs text-gray-500">
                El sistema calculará automáticamente la cantidad de citas a
                agendar.
              </p>
            </div>
            <Switch
              checked={isAuto}
              onCheckedChange={(checked) => {
                setIsAutoEnabled(checked);
                onChange(checked);
                if (checked) {
                  clearErrors("configuration.maxAppointmentsPerDay");
                }
              }}
              className="bg-white"
            />
          </div>
        )}
      />
    </div>
  );
};

export const SlotInterval = ({ register, value, errors }: any) => (
  <div>
    {errors.configuration?.slotInterval && (
      <span className="text-xs text-red-400">
        Este campo es requerido y debe ser un número mayor a 10.
      </span>
    )}
    <Input
      className={`focus:outline-none placeholder:text-gray-400 rounded-md text-sm p-2 w-full ${
        errors.configuration?.slotInterval ? "border-[1px] border-red-400" : ""
      }`}
      placeholder="Duración en minutos entre citas consecutivas."
      type="number"
      min={10}
      defaultValue={value}
      {...register("configuration.slotInterval", {
        required: true,
        min: 10,
        valueAsNumber: true,
      })}
    />
  </div>
);

export const Integrations = ({
  value,
  clearErrors,
  control,
  watch,
  userData,
}: ComponentProps) => {
  const { organizationId, userId } = userData;
  const appointmentIntegrations = [
    {
      name: "calendly",
      displayName: "Calendly",
      icon: "/icons/calendly.svg",
      description: "Sincroniza tus citas automáticamente",
    },
  ];

  const { data: user } = useSuspenseQuery(
    getUserDataQO({
      type: "users",
      query: {
        method: "getUserData",
        data: {
          withIntegrations: true,
        },
      },
      userData: {
        organizationId,
        userId,
      },
    })
  );

  const { email, integrations } = user;

  const getIntegrationStatus = (appName: string) => {
    return integrations && integrations.some((ci) => ci.service === appName);
  };

  const getIntegrationData = (appName: string) => {
    return integrations?.find((ci) => ci.service === appName);
  };

  const getActiveIntegrations = () => {
    // Usar watch para obtener el valor actual del formulario
    const currentFormValue = watch
      ? watch("configuration.integrations")
      : value.value || [];

    return appointmentIntegrations.filter(
      (integration) =>
        getIntegrationStatus(integration.name) && // Está conectada la cuenta
        currentFormValue.some((item: any) =>
          typeof item === "string"
            ? item === integration.name
            : item.service === integration.name
        ) // Y el switch está activado
    );
  };

  const activeIntegrations = getActiveIntegrations();

  return (
    <div className="">
      <NewDialog
        title={
          <p className="text-slate-500 font-medium">Integra tus aplicaciones</p>
        }
        trigger={
          <Button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">
            <Unplug className="w-4 h-4" />
            Integraciones
          </Button>
        }
        className="w-1/3 min-w-[400px]"
        removeSaveBtn
        cancelBtnText="Cerrar"
      >
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <p className="text-slate-500 text-sm">
              Conecta tus herramientas favoritas para automatizar tu flujo de
              trabajo
            </p>
          </div>

          <div className="space-y-3">
            {appointmentIntegrations.map((integration) => {
              const isConnected = getIntegrationStatus(integration.name);
              return (
                <div
                  key={integration.name}
                  className={`
                  relative border rounded-lg p-4 transition-all duration-200
                  ${
                    isConnected
                      ? "border-slate-200 bg-white shadow-sm hover:shadow-md"
                      : "border-slate-100 bg-slate-50/50"
                  }
                `}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    ${isConnected ? "bg-blue-50" : "bg-slate-100"}
                  `}
                    >
                      <img
                        src={integration.icon}
                        alt={integration.displayName}
                        className={`w-6 h-6 ${!isConnected ? "opacity-40" : ""}`}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={`font-medium ${isConnected ? "text-slate-700" : "text-slate-400"}`}
                        >
                          {integration.displayName}
                        </h3>
                        <div
                          className={`
                        px-2 py-0.5 rounded-full text-xs font-medium
                        ${
                          isConnected
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }
                      `}
                        >
                          {isConnected ? "Conectado" : "Desconectado"}
                        </div>
                      </div>

                      <p
                        className={`text-sm ${isConnected ? "text-slate-500" : "text-slate-400"}`}
                      >
                        {integration.description}
                      </p>
                    </div>
                  </div>

                  {isConnected ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700 mb-1">
                            Sincronización automática
                          </p>
                          <p className="text-xs text-slate-500">
                            Las citas se sincronizarán automáticamente con tu
                            cuenta de {integration.displayName}
                          </p>
                        </div>
                        <Controller
                          control={control}
                          name="configuration.integrations"
                          defaultValue={value.value || []}
                          render={({
                            field: { onChange, value: fieldValue },
                          }) => (
                            <Switch
                              checked={
                                fieldValue?.some((item: any) =>
                                  typeof item === "string"
                                    ? item === integration.name
                                    : item.service === integration.name
                                ) || false
                              }
                              onCheckedChange={(checked) => {
                                const currentArray = fieldValue || [];
                                let newActive: any[];

                                if (checked) {
                                  // Obtener los datos de la integración
                                  const integrationData = getIntegrationData(
                                    integration.name
                                  );

                                  // Crear el objeto de integración con los nuevos campos
                                  const integrationObject = {
                                    integrationId: integrationData?.id,
                                    service: integration.name,
                                    userId: userId,
                                    email: email,
                                    tokenData: {
                                      expiresAt:
                                        integrationData?.expiresAt || null,
                                      createdAt:
                                        integrationData?.createdAt || null,
                                      updatedAt:
                                        integrationData?.updatedAt || null,
                                    },
                                  };

                                  // Filtrar elementos existentes que no sean de este servicio
                                  const filteredArray = currentArray.filter(
                                    (item: any) =>
                                      typeof item === "string"
                                        ? item !== integration.name
                                        : item.service !== integration.name
                                  );

                                  newActive = [
                                    ...filteredArray,
                                    integrationObject,
                                  ];
                                } else {
                                  // Remover la integración
                                  newActive = currentArray.filter(
                                    (item: any) =>
                                      typeof item === "string"
                                        ? item !== integration.name
                                        : item.service !== integration.name
                                  );
                                }

                                onChange(newActive);

                                if (newActive.length > 0) {
                                  clearErrors("configuration.integrations");
                                }
                              }}
                              className="ml-3"
                            />
                          )}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <TriangleAlert className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-500 font-semibold mb-1">
                            Conexión requerida
                          </p>
                          <p className="text-xs text-slate-500">
                            Ve a{" "}
                            <span className="font-semibold text-slate-500">
                              Conexiones
                            </span>{" "}
                            y en la pestaña{" "}
                            <span className="font-semibold text-slate-500">
                              Integraciones
                            </span>{" "}
                            conecta tu cuenta de {integration.displayName} para
                            habilitar la sincronización
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">
              ¿Necesitas ayuda? Contactate con nosotros.
            </p>
          </div>
        </div>
      </NewDialog>

      <div className="mt-3">
        {activeIntegrations.length > 0 ? (
          <div className="space-y-2">
            {activeIntegrations.map((integration) => (
              <div
                key={integration.name}
                className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <img
                    src={integration.icon}
                    alt={integration.displayName}
                    className="w-5 h-5"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">
                    Conectado a {integration.displayName}
                  </p>
                  <p className="text-xs text-green-600">
                    {email} • Sincronización activa
                  </p>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Unplug className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600">
                Sin integraciones activas
              </p>
              <p className="text-xs text-slate-500">
                Conecta una aplicación para sincronizar automáticamente
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/*
export const Integrations = ({
  setValue,
  currentIntegrations,
  value,
  clearErrors,
  control,
  watch,
}: any) => {
  const appointmentIntegrations = [
    {
      name: "calendly",
      displayName: "Calendly",
      icon: "/icons/calendly.svg",
      description: "Sincroniza tus citas automáticamente",
    },
  ];

  const getIntegrationStatus = (appName: string) => {
    return currentIntegrations.some(
      (ci: { service: string }) => ci.service === appName
    );
  };

  const getActiveIntegrations = () => {
    // Usar watch para obtener el valor actual del formulario
    const currentFormValue = watch
      ? watch("configuration.integrations")
      : value.value || [];

    return appointmentIntegrations.filter(
      (integration) =>
        getIntegrationStatus(integration.name) && // Está conectada la cuenta
        currentFormValue.includes(integration.name) // Y el switch está activado
    );
  };

  const activeIntegrations = getActiveIntegrations();

  return (
    <div className="">
      <NewDialog
        title={
          <p className="text-slate-500 font-medium">Integra tus aplicaciones</p>
        }
        trigger={
          <Button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">
            <Unplug className="w-4 h-4" />
            Integraciones
          </Button>
        }
        className="w-1/3 min-w-[400px]"
        removeSaveBtn
        cancelBtnText="Cerrar"
      >
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <p className="text-slate-500 text-sm">
              Conecta tus herramientas favoritas para automatizar tu flujo de
              trabajo
            </p>
          </div>

          <div className="space-y-3">
            {appointmentIntegrations.map((integration) => {
              const isConnected = getIntegrationStatus(integration.name);
              return (
                <div
                  key={integration.name}
                  className={`
                  relative border rounded-lg p-4 transition-all duration-200
                  ${
                    isConnected
                      ? "border-slate-200 bg-white shadow-sm hover:shadow-md"
                      : "border-slate-100 bg-slate-50/50"
                  }
                `}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    ${isConnected ? "bg-blue-50" : "bg-slate-100"}
                  `}
                    >
                      <img
                        src={integration.icon}
                        alt={integration.displayName}
                        className={`w-6 h-6 ${!isConnected ? "opacity-40" : ""}`}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={`font-medium ${isConnected ? "text-slate-700" : "text-slate-400"}`}
                        >
                          {integration.displayName}
                        </h3>
                        <div
                          className={`
                        px-2 py-0.5 rounded-full text-xs font-medium
                        ${
                          isConnected
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }
                      `}
                        >
                          {isConnected ? "Conectado" : "Desconectado"}
                        </div>
                      </div>

                      <p
                        className={`text-sm ${isConnected ? "text-slate-500" : "text-slate-400"}`}
                      >
                        {integration.description}
                      </p>
                    </div>
                  </div>

                  {isConnected ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700 mb-1">
                            Sincronización automática
                          </p>
                          <p className="text-xs text-slate-500">
                            Las citas se sincronizarán automáticamente con tu
                            cuenta de {integration.displayName}
                          </p>
                        </div>
                        <Controller
                          control={control}
                          name="configuration.integrations"
                          defaultValue={value.value || []}
                          render={({
                            field: { onChange, value: fieldValue },
                          }) => (
                            <Switch
                              checked={
                                fieldValue?.includes(integration.name) || false
                              }
                              onCheckedChange={(checked) => {
                                const currentArray = fieldValue || [];
                                let newActive: string[];

                                if (checked) {
                                  newActive = [
                                    ...new Set([
                                      ...currentArray,
                                      integration.name,
                                    ]),
                                  ];
                                } else {
                                  newActive = currentArray.filter(
                                    (name: string) => name !== integration.name
                                  );
                                }

                                onChange(newActive);

                                if (newActive.length > 0) {
                                  clearErrors("configuration.integrations");
                                }
                              }}
                              className="ml-3"
                            />
                          )}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <TriangleAlert className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-500 font-semibold mb-1">
                            Conexión requerida
                          </p>
                          <p className="text-xs text-slate-500">
                            Ve a{" "}
                            <span className="font-semibold text-slate-500">
                              Conexiones
                            </span>{" "}
                            y en la pestaña{" "}
                            <span className="font-semibold text-slate-500">
                              Integraciones
                            </span>{" "}
                            conecta tu cuenta de {integration.displayName} para
                            habilitar la sincronización
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">
              ¿Necesitas ayuda? Contactate con nosotros.
            </p>
          </div>
        </div>
      </NewDialog>

      <div className="mt-3">
        {activeIntegrations.length > 0 ? (
          <div className="space-y-2">
            {activeIntegrations.map((integration) => (
              <div
                key={integration.name}
                className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <img
                    src={integration.icon}
                    alt={integration.displayName}
                    className="w-5 h-5"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">
                    Estás conectado a {integration.displayName}
                  </p>
                  <p className="text-xs text-green-600">
                    Sincronización activa
                  </p>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Unplug className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600">
                Sin integraciones activas
              </p>
              <p className="text-xs text-slate-500">
                Conecta una aplicación para sincronizar automáticamente
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
*/

/*

type ShiftUsers = {
  fullName: string;
  schedule: {
    monday: { ubication: string; from: string; to: string; restHours: { from: string; to: string }[] | null; local: string };
    tuesday: { ubication: string; from: string; to: string; restHours: { from: string; to: string }[] | null; local: string };
    wednesday: { ubication: string; from: string; to: string; restHours: { from: string; to: string }[] | null; local: string };
    thursday: { ubication: string; from: string; to: string; restHours: { from: string; to: string }[] | null; local: string };
    friday: { ubication: string; from: string; to: string; restHours: { from: string; to: string }[] | null; local: string };
    saturday: { ubication: string; from: string; to: string; restHours: { from: string; to: string }[] | null; local: string };
    sunday: { ubication: string; from: string; to: string; restHours: { from: string; to: string }[] | null; local: string };
  };
};

type ShiftStructure = {
  ubications: string[];
  locals: string[];
  users: ShiftUsers[];
}
 */

/*
export const Shift = ({
  register,
  value,
  errors,
  setValue,
}: {
  register: UseFormRegister<any>;
  value: any;
  errors: FieldErrors;
  setValue: any;
}) => {
  console.log("VALOR: ", value.value);
  const dayMap: Record<string, string> = {
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miércoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sábado",
    sunday: "Domingo",
  };
  const [showSchedules, setShowSchedules] = useState<number | undefined>(undefined);
  const [shifts, setShifts] = useState<ShiftStructure>(value.value);

  const [newUbication, setNewUbication] = useState("");
  const [newLocal, setNewLocal] = useState("");
  const [isUbicationsDialogOpen, setIsUbicationsDialogOpen] = useState(false);
  const [isLocalsDialogOpen, setIsLocalsDialogOpen] = useState(false);

  const updateSchedule = (index: number, day: keyof typeof dayMap, field: string, newValue: any) => {
    const updatedUsers: any = [...shifts.users];
    updatedUsers[index].schedule[day][field] = newValue;
    const updatedShifts: ShiftStructure = { ...shifts, users: updatedUsers };
    setShifts(updatedShifts);
    setValue("configuration.shifts", updatedShifts);
  };

  const updateShiftName = (index: number, name: string) => {
    const updatedUsers: ShiftStructure["users"] = [...shifts.users];
    updatedUsers[index].fullName = name;
    const updatedShifts: ShiftStructure = { ...shifts, users: updatedUsers };
    setShifts(updatedShifts);
    setValue("configuration.shifts", updatedShifts);
  };

  const addNewShift = () => {
    const defaultScheduleProperties = {
      fullName: "",
      schedule: {
        monday: { ubication: "", from: "08:00", to: "17:00", restHours: null, local: "" },
        tuesday: { ubication: "", from: "08:00", to: "17:00", restHours: null, local: "" },
        wednesday: { ubication: "", from: "08:00", to: "17:00", restHours: null, local: "" },
        thursday: { ubication: "", from: "08:00", to: "17:00", restHours: null, local: "" },
        friday: { ubication: "", from: "08:00", to: "17:00", restHours: null, local: "" },
        saturday: { ubication: "", from: "08:00", to: "17:00", restHours: null, local: "" },
        sunday: { ubication: "", from: "08:00", to: "17:00", restHours: null, local: "" },
      },
    };
    const updatedUsers = [...shifts.users, defaultScheduleProperties];
    const updatedShifts: ShiftStructure = { ...shifts, users: updatedUsers };
    setShifts(updatedShifts);
    setValue("configuration.shifts", updatedShifts);
  };

  const addNewUbication = () => {
    if (newUbication.trim()) {
      const updatedUbications = [...shifts.ubications, newUbication.trim()];
      const updatedShifts = { ...shifts, ubications: updatedUbications };
      setShifts(updatedShifts);
      setValue("configuration.shifts", updatedShifts);
      setNewUbication("");
    }
  };

  const addNewLocal = () => {
    if (newLocal.trim()) {
      const updatedLocals = [...shifts.locals, newLocal.trim()];
      const updatedShifts = { ...shifts, locals: updatedLocals };
      setShifts(updatedShifts);
      setValue("configuration.shifts", updatedShifts);
      setNewLocal("");
    }
  };

  return (
    <NewDialog
      title={<p className="text-slate-600">Configuración de sistema de turnos</p>}
      trigger={<Button>Modificar los turnos</Button>}
      removeSaveBtn={true}
      cancelBtnText="Cerrar"
      className="w-2/4 max-h-2/6 overflow-auto"
    >
      <Button onClick={addNewShift} variant="outline" className="gap-3 text-slate-500 hover:text-slate-500">
        <PlusCircle /> Agregar turno
      </Button>
      <div className="border-t border-slate-300 my-3"></div>

      <div className="flex gap-2">
        <Input
          value={newUbication}
          onChange={(e) => setNewUbication(e.target.value)}
          placeholder="Nueva ubicación"
          className="text-slate-500"
          autoComplete="off"
          autoCorrect="off"
        />
        <Button onClick={addNewUbication} variant="outline" className="gap-3 text-slate-500 hover:text-slate-500">
          <PlusCircle /> Agregar
        </Button>
        <Button onClick={() => setIsUbicationsDialogOpen(true)} variant="outline" className="text-slate-500">
          Detalles
        </Button>
      </div>

      <div className="border-t border-slate-300 my-3"></div>

      <div className="flex gap-2 mt-2">
        <Input
          value={newLocal}
          onChange={(e) => setNewLocal(e.target.value)}
          placeholder="Nuevo local"
          className="text-slate-500"
          autoComplete="off"
          autoCorrect="off"
        />
        <Button onClick={addNewLocal} variant="outline" className="gap-3 text-slate-500 hover:text-slate-500">
          <PlusCircle /> Agregar
        </Button>
        <Button onClick={() => setIsLocalsDialogOpen(true)} variant="outline" className="text-slate-500">
          Detalles
        </Button>
      </div>

      {isUbicationsDialogOpen && (
        <NewDialog
          title="Ubicaciones"
          trigger={null}
          isOpen={isUbicationsDialogOpen}
          onOpenChange={setIsUbicationsDialogOpen}
          className="w-1/3"
          removeSaveBtn={true}
          cancelBtnText="Cerrar"
        >
          <div className="flex flex-col gap-2">
            {shifts.ubications.length > 0 ? shifts.ubications.map((ubication, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  value={ubication}
                  onChange={(e) => {
                    const updatedUbications = [...shifts.ubications];
                    updatedUbications[idx] = e.target.value;
                    const updatedShifts = { ...shifts, ubications: updatedUbications };
                    setShifts(updatedShifts);
                    setValue("configuration.shifts", updatedShifts);
                  }}
                />
                <Button
                  variant="destructive"
                  onClick={() => {
                    const updatedUbications = shifts.ubications.filter((_, i) => i !== idx);
                    const updatedShifts = { ...shifts, ubications: updatedUbications };
                    setShifts(updatedShifts);
                    setValue("configuration.shifts", updatedShifts);
                  }}
                >
                  Eliminar
                </Button>
              </div>
            )) : (
              <p className="text-slate-500">No has agregado ninguna ubicación</p>
            )}
          </div>
        </NewDialog>
      )}

      {isLocalsDialogOpen && (
        <NewDialog
          title="Locales"
          trigger={null}
          isOpen={isLocalsDialogOpen}
          onOpenChange={setIsLocalsDialogOpen}
          className="w-1/3"
          removeSaveBtn={true}
          cancelBtnText="Cerrar"
        >
          <div className="flex flex-col gap-2">
            {shifts.locals.length > 0 ? shifts.locals.map((local, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  value={local}
                  onChange={(e) => {
                    const updatedLocals = [...shifts.locals];
                    updatedLocals[idx] = e.target.value;
                    const updatedShifts = { ...shifts, locals: updatedLocals };
                    setShifts(updatedShifts);
                    setValue("configuration.shifts", updatedShifts);
                  }}
                />
                <Button
                  variant="destructive"
                  onClick={() => {
                    const updatedLocals = shifts.locals.filter((_, i) => i !== idx);
                    const updatedShifts = { ...shifts, locals: updatedLocals };
                    setShifts(updatedShifts);
                    setValue("configuration.shifts", updatedShifts);
                  }}
                >
                  Eliminar
                </Button>
              </div>
            )) : (
              <p className="text-slate-500">No has agregado ningun local</p>
            )}
          </div>
        </NewDialog>
      )}

      <div className="overflow-y-auto max-h-96">
        {shifts.users?.length > 0 ? (
          shifts.users.map((shift, index) => (
            <div key={index} className="border p-2 rounded-md mt-2 text-slate-500">
              <Input
                type="text"
                placeholder="Nombre del empleado"
                className="mb-2"
                value={shift.fullName}
                onChange={(e) => updateShiftName(index, e.target.value)}
              />

              {showSchedules === index ? (
                <button onClick={() => setShowSchedules(undefined)} className="bg-slate-100 px-2 rounded-md text-sm">
                  Ocultar horarios
                </button>
              ) : (
                <button onClick={() => setShowSchedules(index)} className="bg-slate-100 px-2 rounded-md text-sm">
                  Mostrar horarios
                </button>
              )}

              {showSchedules === index && (
                <motion.div
                  initial={{ opacity: 0, scaleY: 0.9, maxHeight: 0, overflow: "hidden" }}
                  animate={{ opacity: 1, scaleY: 1, maxHeight: "15rem", overflowY: "auto" }}
                  exit={{ opacity: 0, scaleY: 0.9, maxHeight: 0, overflow: "hidden" }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="flex border-b flex-col h-60 overflow-y-auto border rounded-md p-1 gap-1"
                >
                  {Object.entries(shift.schedule).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex border p-1 flex-col">
                      <p className="border-b-1 w-fit font-medium">{dayMap[key]}</p>
                      <div className="flex gap-1 flex-col">
                        <div>
                          <p className="text-sm">Ubicación:</p>
                          <NewSearchSelect
                            defaultValue={{
                              label: value.ubication || "Sin ubicación",
                              value: value.ubication || "",
                            }}
                            content={[
                              {
                                options: shifts.ubications.map((loc) => ({ item: loc, value: loc })),
                              },
                            ]}
                            placeholder="Selecciona una ubicación"
                            onChange={(selected) =>
                              updateSchedule(index, key as keyof typeof dayMap, "ubication", selected)
                            }
                            className="w-full"
                          />
                        </div>
                        <div>
                          <p className="text-sm">Horario: </p>
                          <div className="flex gap-2">
                            <NewHourPicker
                              value={value.from}
                              onChange={(newTime) =>
                                updateSchedule(index, key as keyof typeof dayMap, "from", newTime)
                              }
                              placeholder="Hora de inicio"
                              setValue={setValue}
                              name="startTime"
                              clearErrors={() => { }}
                              isSubmitted={false}
                            />
                            <NewHourPicker
                              value={value.to}
                              onChange={(newTime) =>
                                updateSchedule(index, key as keyof typeof dayMap, "to", newTime)
                              }
                              placeholder="Hora de fin"
                              setValue={setValue}
                              name="endTime"
                              clearErrors={() => { }}
                              isSubmitted={false}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm">Local: </p>
                          <NewSearchSelect
                            defaultValue={{
                              label: value.local || "Sin local",
                              value: value.local || "",
                            }}
                            content={[
                              {
                                options: shifts.locals.map((loc) => ({ item: loc, value: loc })),
                              },
                            ]}
                            placeholder="Selecciona un local"
                            onChange={(selected) =>
                              updateSchedule(index, key as keyof typeof dayMap, "local", selected)
                            }
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm pt-2 text-slate-500">No has creado ninguno.</p>
        )}
      </div>
    </NewDialog>
  );
};
 */
