import { getAvailability } from "./utils/get-availability";
import { searchUser } from "./utils/search-user";
import { getDetails } from "./utils/get-details";
import { collisionVerifier } from "./utils/collision-verifier";
import { newActionResult } from "../../new-action-result";
import { fieldValidation } from "./utils/field-validation";
import {
  addOrSubstractFromTime,
  cleanDate,
  getDatePart,
  getDayOfTheWeek,
} from "../../utils";
import {
  FunctionCallingProps,
  ActionResponse,
  AppointmentsArgs,
  AppointsmentsConfiguration,
  TransformedAppointmentArgs,
} from "../../../src/types";

// Estado en la tabla de acciones, los estados estan en las tablas de action_results
export const appoinmentStatus = {
  COMPLETED: "completed",
  PENDING: "pending",
  CANCELED: "canceled",
};

export const appointment = async <TAgentContext>({
  stateHelpers,
  functionType,
  functionArguments,
  assistantId,
  actionConfiguration,
  userData,
  from,
  to,
  env,
}: FunctionCallingProps<
  TAgentContext,
  AppointmentsArgs
>): Promise<ActionResponse> => {
  try {
    const { actionId, configurationData } = actionConfiguration["appointment"];

    const appointmentsConfiguration =
      configurationData as AppointsmentsConfiguration;

    /*
     * LIMPIEZA DE DATOS.
     * Limpiamos la fecha para que no sea una fecha anterior a la actual antes de procesarla.
     * Verificamos el "time" que es la hora propuesta por el usuario y le sumamos el 'slotInterval', creando 'startTime' y 'endTime' como objeto.
     * Finalmente retornamos todos los datos terminados y listos para ser utilizados en cualquier tipo de acción.
     * Inicializamos 'finalResults' estructurando como se realizaran los cambios.
     */
    let finalResults: TransformedAppointmentArgs = {
      ...functionArguments,
      time: { startTime: "", endTime: "" },
    };
    if (functionArguments.date || functionArguments.time) {
      const isValidDate = cleanDate(
        functionArguments.date,
        functionArguments.time,
      );

      if (!isValidDate.success) {
        if (isValidDate.error.type === "yearsExceeded") {
          return {
            withTemplate: false,
            data: {
              response: `Error: El año indicado es demasiado lejano en el futuro. **Instrucciones para el asistente:** Indícale al usuario que debe proporcionar una fecha realista y dentro de un rango cercano.`,
            },
          };
        }

        if (isValidDate.error.type === "invalidMonth") {
          return {
            withTemplate: false,
            data: {
              response: `Error: El mes proporcionado no es válido. **Instrucciones para el asistente:** Pide al usuario que revise la fecha y proporcione un mes válido (entre 1 y 12).`,
            },
          };
        }

        if (isValidDate.error.type === "invalidDate") {
          return {
            withTemplate: false,
            data: {
              response: `Error: La fecha proporcionada parece incorrecta. **Instrucciones para el asistente:** Solicita al usuario que repita la fecha asegurándose de que el día y el mes sean correctos.`,
            },
          };
        }

        if (isValidDate.error.type === "formatError") {
          return {
            withTemplate: false,
            data: {
              response: `Error: El formato de la fecha no es válido. **Instrucciones para el asistente:** Pide al usuario que exprese la fecha de la siguiente forma: año, mes y dia.`,
            },
          };
        }

        if (isValidDate.error.type === "pastDateError") {
          return {
            withTemplate: false,
            data: {
              response: `Error: La fecha proporcionada está en el pasado. **Instrucciones para el asistente:** Indícale al usuario que debe proporcionar una fecha actual o futura.`,
            },
          };
        }

        if (isValidDate.error.type === "pastHourError") {
          return {
            withTemplate: false,
            data: {
              response: `Error: La hora indicada ya ha pasado. **Instrucciones para el asistente:** Pide al usuario que proporcione una hora válida en el futuro.`,
            },
          };
        }

        if (isValidDate.error.type === "dateError") {
          return {
            withTemplate: false,
            data: {
              response: `Error: Hay un problema con la fecha ingresada. **Instrucciones para el asistente:** Solicita al usuario que revise la fecha y la proporcione nuevamente de forma clara.`,
            },
          };
        }

        if (isValidDate.error.type === "yearError") {
          functionArguments.date = isValidDate.error.data;
        }
      }

      const calculatedEndtime = addOrSubstractFromTime(
        functionArguments.time,
        appointmentsConfiguration.slotInterval.value,
      );

      finalResults = {
        ...functionArguments,
        time: {
          endTime: calculatedEndtime,
          startTime: functionArguments.time,
        },
      };
    }

    const { time: proposedTime, date: proposedDate, actionType } = finalResults;

    const { cancelSchedule, schedule, setState, state } = stateHelpers;
    const { organizationId } = userData;

    /*
    if (actionType === "create") {
      const validatedFields = await fieldValidation(finalResults);

      if (!validatedFields.success) {
        return {
          withTemplate: false,
          data: { response: validatedFields.error },
        };
      }

      // Obtiene la disponibilidad de citas para la fecha y hora proporcionadas
      const availability = await getAvailability<TAgentContext>(
        stateHelpers,
        proposedDate,
        proposedTime,
        actionId,
        appointmentsConfiguration,
        from,
        to,
        userData,
        "create",
        env,
      );

      // Si hay un error, simplemente retorna un string representando el error.
      if (!availability.success) {
        return {
          withTemplate: false,
          data: { response: availability.error },
        };
      }

      const { isBookeable } = availability.data;

      // Si hay disponibilidad, se guarda la cita en la base de datos
      if (!isBookeable) {
        return {
          withTemplate: false,
          data: {
            response: `No hay disponibilidad: ${proposedDate} ${proposedTime}`,
          },
        };
      }
      console.log(actionId);
      // Verificación de colisión entre fecha y hora (se asegura que la fecha y hora no colisionen con una existente).
      const isCollision = await collisionVerifier(
        functionArguments,
        actionId,
        userData,
        env,
      );

      if (!isCollision.success) {
        return { withTemplate: false, data: isCollision.error };
      }

      // Si hay colisión, retornamos con un mensaje de error del asistente.
      if (isCollision.data) {
        const { date } = functionArguments;

        return {
          withTemplate: false,
          data: {
            response: `El día ${getDayOfTheWeek(date)} ${getDatePart(
              date,
              "day",
            )} de ${getDatePart(date, "month")} ya hay una cita agendada.`,
          },
        };
      }

      const newAction = await newActionResult(
        assistantId,
        functionType,
        validatedFields.data,
        actionId,
        userData,
        env,
      );

      if (!newAction.success) {
        return {
          withTemplate: false,
          data: {
            response: `Ha ocurrido un error al crear la cita.`,
          },
        };
      }

      // Estos datos se obtienen desde la columna "result" el cual es un jsonb con la información de la cita.
      const { date, time, name, code, phone, email } = newAction.data
        .result as Record<string, any>;

      return {
        withTemplate: true,
        data: {
          category: "appointments",
          type: "createdAppointment",
          response: { code, date, phone, email, name, time },
        },
        responseMetadata: { actionType: "create" },
      };
    }

    if (actionType === "details") {
      if (!functionArguments.code) {
        return {
          withTemplate: false,
          data: {
            response: `El código de la cita es requerido.`,
          },
        };
      }

      const details = await getDetails(
        functionArguments.code,
        actionId,
        organizationId,
        env,
      );

      if (!details.success) {
        return {
          withTemplate: false,
          data: { response: details.error },
        };
      }

      const { code, phone, date, email, name, time } = details.data.result;
      const status = details.data.status;

      return {
        withTemplate: true,
        data: {
          category: "appointments",
          type: "appointmentDetails",
          response: { code, date, phone, email, name, time, status },
        },
        responseMetadata: {},
      };
    }

    if (actionType === "availability") {
      const availability = await getAvailability<TAgentContext>(
        stateHelpers,
        proposedDate,
        proposedTime,
        actionId,
        appointmentsConfiguration,
        from,
        to,
        userData,
        "create",
        env,
      );

      if (!availability.success) {
        return {
          withTemplate: false,
          data: { response: availability.error },
        };
      }

      const { bookingRecommendations } = availability.data;

      // Si hay disponibilidad, se retorna la disponilidad para ese dia, junto con otras recomendaciones si es posible
      if (availability.data.isBookeable) {
        console.log("porobinha: ", !proposedTime);
        let message = `Hay disponibilidad de citas para el dia ${proposedDate} `;

        // Si la hora no fue proporcionada, se hace recomendación de citas.
        if (bookingRecommendations.length > 0 && !proposedTime) {
          message += `las citas disponibles son: ${bookingRecommendations}, **Instrucciones del asistente:**`;
        }

        if (proposedTime.startTime) {
          message += `a las ${proposedTime.startTime}, ¿Quieres que te agende esta cita?`;
        }

        return {
          withTemplate: true,
          data: {
            category: "appointments",
            type: "appointmentDetails",
            response: message,
          },
          responseMetadata: {},
        };
      }

      return {
        withTemplate: false,
        data: {
          response: "No hay disponibilidad de citas para el día proporcionado.",
        },
      };
    }

    if (actionType === "update") {
      if (!functionArguments.code) {
        return {
          withTemplate: false,
          data: {
            response: `El código de la cita es requerido.`,
          },
        };
      }

      // Por medio del "actionState" donde guardamos todos los datos de las acciones del usuario, buscamos el codigo de la cita.
      const appointment = state.actionState?.appointments?.find(
        (appointment) => appointment.appointmentCode === functionArguments.code,
      );

      const appointmentScheduleCode = appointment?.scheduleCode;

      if (!appointmentScheduleCode) {
        return {
          withTemplate: false,
          data: {
            response: `Ha ocurrido un error al encontrar los datos de la cita.`,
          },
        };
      }

      await cancelSchedule(appointmentScheduleCode);

      // Volver a hacer un schedule con la cita actualizada.
      const response = await searchUser<TAgentContext>(
        functionArguments,
        actionId,
        "update",
        functionArguments.code,
        stateHelpers,
        proposedDate,
        proposedTime,
        appointmentsConfiguration,
        from,
        userData,
        env,
      );

      console.log("update response: ", response);
      if (!response.success) {
        return {
          withTemplate: false,
          data: {
            response: response.error,
          },
        };
      }

      return {
        withTemplate: false,
        data: {
          response: "No hay disponibilidad de citas para el día proporcionado.",
        },
      };
    }
     */
    /*


    if (actionType === "cancel") {
      const { code } = functionArguments;

      if (!code) {
        return "Lo siento, no he podido obtener el código de la cita. ¿Podrías repetirlo, por favor?";
      }

      const response = await searchUser(
        functionArguments,
        functionType,
        assistantId,
        "cancel",
        code,
        sql,
        env
      );

      console.log("cancel response: ", response);
      return response;
    }
     */

    throw Error();
  } catch (error) {
    console.error("err de func => ", error);
    return {
      withTemplate: false,
      data: {
        response: "Ha ocurrido un error.",
      },
    };
  }
};
