"use client";

import { NewDialog } from "@/components/customized/new-dialog";
import NewHourPicker from "@/components/customized/new-hour-picker";
import { NewSelect } from "@/components/customized/new-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, X } from "lucide-react";
import { useState } from "react";
import { Controller } from "react-hook-form";

export const Inventory = ({ register, value, errors }: any) => {
  return (
    <NewDialog
      title={
        <p className="text-lg font-medium text-slate-600">Gestion inventario</p>
      }
      trigger={<Button>Inventario</Button>}
      className="w-3/5"
      removeSaveBtn={true}
      cancelBtnText="Cerrar"
    >
      <div className="flex gap-4 h-96">
        <div className="border flex-col rounded p-2 gap-1 flex w-full">
          <div className="flex flex-col gap-1 overflow-y-auto border p-1 h-full">
            <textarea
              className={`text-slate-600 h-full resize-none focus:outline-none placeholder:text-gray-400 rounded-md text-sm p-2 w-full ${errors.products ? "border-[1px] border-red-400" : ""}`}
              placeholder="Lista de productos de esta orden"
              {...register("configuration.inventory.products")}
              defaultValue={value.value.products}
            />
          </div>
        </div>
      </div>
    </NewDialog>
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
                defaultValue={value.value[day].isEnabled}
                render={({ field: { onChange, value } }) => (
                  <Switch checked={value} onCheckedChange={onChange} />
                )}
              />

              <div className="flex gap-2 w-full">
                <Controller
                  control={control}
                  name={`configuration.schedule.${day}.startTime`}
                  defaultValue={value.value[day].startTime}
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
                  defaultValue={value.value[day].endTime}
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

export const QRPayment = ({ register, value, control, watch }: any) => {
  // Pasa el valor por defecto al watch
  const payments = watch(
    "configuration.QRPayments.isEnabled",
    value.value.isEnabled
  );

  return (
    <div className="border rounded p-2">
      <div className="flex items-center gap-2 p-1">
        <Controller
          control={control}
          name="configuration.QRPayments.isEnabled"
          defaultValue={value.value.isEnabled}
          render={({ field: { onChange, value: isEnabled } }) => (
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
              <Switch checked={isEnabled} onCheckedChange={onChange} />
              <p className="text-sm">
                Activar pagos{" "}
                <span className="text-xs">
                  (Si se activa, el asistente se encargará de manejar los pagos
                  automáticamente)
                </span>
              </p>
            </div>
          )}
        />
      </div>
      {payments ? (
        <div className="flex flex-col gap-2 p-1">
          <p className="text-xs">
            Para generar QRs automáticos a la hora de crear la orden, llena los
            siguientes campos.
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                Tipo de documento del cliente titular de la cuenta destino de la
                transferencia.
              </label>
              <Controller
                control={control}
                name="configuration.QRPayments.documentType"
                defaultValue={value.value.documentType}
                render={({ field: { onChange, value } }) => (
                  <NewSelect
                    value={value}
                    onChange={onChange}
                    placeholder="Tipo de documento"
                    content={[
                      { label: "Cédula de Ciudadania", value: "CC" },
                      { label: "Carnet Diplomatico", value: "CD" },
                      { label: "Cédula de Extranjeria", value: "CE" },
                      { label: "NIT", value: "NIT" },
                      { label: "Tarjeta de Identidad", value: "TI" },
                      { label: "Pasaporte", value: "PAS" },
                    ]}
                    defaultValue={{
                      label: "Cédula de Ciudadania",
                      value: "CC",
                    }}
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                Número de documento del cliente titular de la cuenta destino de
                la transferencia.
              </label>
              <Input
                type="text"
                placeholder="Número de documento"
                {...register("configuration.QRPayments.documentNumber")}
                maxLength={20}
                minLength={1}
                // Elimina el atributo 'value' para que no sobrescriba lo que ingresa el usuario
                defaultValue={value.value.documentNumber}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                Número único del comercio
              </label>
              <Input
                type="text"
                placeholder="Número único del comercio"
                {...register("configuration.QRPayments.merchantId")}
                maxLength={20}
                minLength={1}
                defaultValue={value.value.merchantId}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                Nombre del titular de la cuenta destino de la transferencia. (No
                requerido)
              </label>
              <Input
                type="text"
                placeholder="Nombre del titular"
                {...register("configuration.QRPayments.accountHolderName")}
                maxLength={20}
                minLength={1}
                defaultValue={value.value.accountHolderName}
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm px-2">
          El asistente no pedirá dinero al usuario. Únicamente realizará la
          orden.
        </p>
      )}
    </div>
  );
};

export const DeliveriesLocations = ({
  register,
  value,
  control,
  setValue,
  getValues,
}: any) => {
  const [deliveriesLocations, setDeliveriesLocations] = useState(
    value.value || []
  );

  const newDeliveryLocation = () => {
    const currentValues = getValues("configuration.deliveriesLocations") || [];
    const newDeliveriesLocations = [
      ...currentValues,
      { location: "", price: 0 },
    ]; // Initialize price as number
    setDeliveriesLocations(newDeliveriesLocations);
    setValue("configuration.deliveriesLocations", newDeliveriesLocations, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleRemoveDeliveryLocation = (index: number) => {
    const currentValues = getValues("configuration.deliveriesLocations") || [];
    const newDeliveriesLocations = currentValues.filter(
      (_: any, i: number) => i !== index
    );
    setDeliveriesLocations(newDeliveriesLocations);
    setValue("configuration.deliveriesLocations", newDeliveriesLocations, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <div className="h-full">
      <NewDialog
        title={
          <p className="text-lg font-medium text-slate-600">
            Gestion inventario
          </p>
        }
        trigger={<Button>Gestionar localizaciones</Button>}
        className="w-3/5"
        removeSaveBtn={true}
        cancelBtnText="Cerrar"
      >
        <div className="flex gap-1 h-96">
          <div className="border flex-col rounded p-2 gap-1 flex w-full">
            <Button
              className="h-0 w-fit rounded-none rounded-t-md p-1 gap-1"
              type="button"
              onClick={newDeliveryLocation}
            >
              <span className="text-sm">Agregar localización</span>{" "}
              <PlusCircle className="h-4 w-4" />
            </Button>
            <div className="flex flex-col gap-1 overflow-y-auto border p-1 h-full">
              {deliveriesLocations.map(
                (
                  deliveryData: { location: string; price: number },
                  index: number
                ) => (
                  <div key={index} className="flex items-center gap-1">
                    <div className="flex gap-1 w-full">
                      <Input
                        type="text"
                        className="w-full"
                        placeholder="Localización"
                        defaultValue={deliveryData.location}
                        {...register(
                          `configuration.deliveriesLocations.${index}.location`
                        )}
                      />

                      <Button
                        className="w-0"
                        variant={"outline"}
                        type="button"
                        onClick={() => handleRemoveDeliveryLocation(index)}
                      >
                        <X size={17} />
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 w-full border p-2">
            <Button
              className="h-0 w-fit rounded-none rounded-t-md p-1 gap-1"
              type="button"
              onClick={newDeliveryLocation}
            >
              <span className="text-sm">Agregar kilometros</span>{" "}
              <PlusCircle className="h-4 w-4" />
            </Button>
            <div className="flex flex-col gap-1 overflow-y-auto border p-1 h-full">
              {deliveriesLocations.map(
                (
                  deliveryData: { location: string; price: number },
                  index: number
                ) => (
                  <div key={index} className="flex items-center gap-1">
                    <div className="flex gap-1 w-full text-slate-500">
                      <Controller
                        name={`configuration.deliveriesLocations.${index}.price`}
                        control={control}
                        defaultValue={deliveryData.price}
                        render={({ field }) => (
                          <div className="flex items-center">
                            <Input
                              type="text"
                              className="w-full rounded-r-none"
                              placeholder="Precio"
                              value={
                                field.value !== undefined
                                  ? field.value
                                      .toString()
                                      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                                  : ""
                              }
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(
                                  /\D/g,
                                  ""
                                ); // Remove non-digits
                                const numberValue = rawValue
                                  ? Number(rawValue)
                                  : 0;
                                field.onChange(numberValue); // Store as number
                              }}
                            />
                            <div className="text-sm bg-slate-200 p-2 h-full rounded-r-md text-slate-600 font-semibold">
                              km
                            </div>
                          </div>
                        )}
                      />
                      <Controller
                        name={`configuration.deliveriesLocations.${index}.price`}
                        control={control}
                        defaultValue={deliveryData.price}
                        render={({ field }) => (
                          <Input
                            type="text"
                            className="w-20"
                            placeholder="Precio"
                            value={
                              field.value !== undefined
                                ? field.value
                                    .toString()
                                    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                                : ""
                            }
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(
                                /\D/g,
                                ""
                              ); // Remove non-digits
                              const numberValue = rawValue
                                ? Number(rawValue)
                                : 0;
                              field.onChange(numberValue); // Store as number
                            }}
                          />
                        )}
                      />
                      <Button
                        className="w-0"
                        variant={"outline"}
                        type="button"
                        onClick={() => handleRemoveDeliveryLocation(index)}
                      >
                        <X size={17} />
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </NewDialog>
    </div>
  );
};
/*
<button type="button" onClick={newDeliveryLocation} className="w-fit bg-slate-100 rounded-full px-4 text-sm flex items-center gap-1 py-1">
    <span>Agregar localización</span>
    <PlusCircle size={14} />
</button>
<div className="border mt-1 max-h-14 overflow-y-auto bg-slate-700">
    {deliveriesLocations.map((deliveryData: { location: string; price: number }, index: number) => (
        <div key={index} className="flex items-center overflow-y-auto gap-1 p-1">
            <div className="flex gap-2 w-full">
                <Input
                    type="text"
                    className="w-full"
                    placeholder="Localización"
                    defaultValue={deliveryData.location}
                    {...register(`configuration.deliveriesLocations.${index}.location`)}
                />
                <Controller
                    name={`configuration.deliveriesLocations.${index}.price`}
                    control={control}
                    defaultValue={deliveryData.price}
                    render={({ field }) => (
                        <Input
                            type="text"
                            className="w-20"
                            placeholder="Precio"
                            value={
                                field.value !== undefined
                                    ? field.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                                    : ""
                            }
                            onChange={(e) => {
                                const rawValue = e.target.value.replace(/\D/g, ""); // Remove non-digits
                                const numberValue = rawValue ? Number(rawValue) : 0;
                                field.onChange(numberValue); // Store as number
                            }}
                        />
                    )}
                />
            </div>
            <X
                size={20}
                className="hover:text-red-400 cursor-pointer text-slate-400 text-sm"
                onClick={() => handleRemoveDeliveryLocation(index)}
            />
        </div>
    ))}
</div>
 */
