import { Context } from "hono";
import { updateOrDelete } from "./update-or-delete";
import { getAvailability } from "./get-availability";
import { Client } from "@neondatabase/serverless";
import { getDetails } from "./get-details";
import { ActionQueryError, FeedbackError } from "../../../../lib/errors";
import {
  AppointmentsArgs,
  AppointsmentsConfiguration,
  ChatCompletionsHelpers,
  UserData,
} from "../../../../src/types";
import { appoinmentStatus } from "..";
import { ServiceResponse } from "../../../../../global";

export async function searchUser<TAgentContext>(
  functionArguments: AppointmentsArgs,
  actionId: string,
  type: string,
  code: string,
  stateHelpers: ChatCompletionsHelpers<TAgentContext>,
  proposedDate: string,
  proposedTime: { startTime: string; endTime: string },
  appointmentsConfiguration: AppointsmentsConfiguration,
  identifier: string,
  userData: UserData,
  env: Env,
): Promise<ServiceResponse<string, string>> {
  const { organizationId } = userData;

  try {
    const details = await getDetails(code, actionId, organizationId, env);

    if (!details.success) {
      throw new FeedbackError({
        name: "FEEDBACK_ERROR",
        message:
          "Debido a que la cita fue cancelada, no es posible actualizarla.",
      });
    }

    const appointmentDetails = details.data.result;

    /**
     * Validamos el estado de las citas antes de actualizarlas.
     * Las citas con estado "canceled" o "completed" NO deben ser actualizadas.
     */
    if (details.data.status === appoinmentStatus.CANCELED) {
      throw new FeedbackError({
        name: "FEEDBACK_ERROR",
        message:
          "Debido a que la cita fue cancelada, no es posible actualizarla.",
      });
    }

    if (details.data.status === appoinmentStatus.COMPLETED) {
      throw new FeedbackError({
        name: "FEEDBACK_ERROR",
        message: "La cita ya ha sido completada, no es posible actualizarla.",
      });
    }

    console.log("appointmentDetails: ", appointmentDetails);
    console.log("functionArguments: ", functionArguments);
    if (type === "update") {
      if (functionArguments.date && !functionArguments.time) {
        throw new FeedbackError({
          name: "FEEDBACK_ERROR",
          message:
            "Se ha proporcionado una fecha, pero no una hora para actualizar la cita.",
        });
      }

      // Validamos si existe un codigo, fecha y hora igual, de esta forma, no es necesario validar, ya que el usuario lo que quiere es cambiar otros campos.
      // Si al menos uno de los campos (code, date, time) es diferente,
      // llama a getAvailability.

      // el "true", como parametro antepenultimo, indica que es una actualización para evitar problemas con maxAppointmentsPerDay
      // Obtiene la disponibilidad segun la hora proporcionada por el usuario (fecha/hora) a actualizar o fecha/hora existente.
      if (functionArguments.date && functionArguments.time) {
        const availability = await getAvailability<TAgentContext>(
          stateHelpers,
          proposedDate,
          proposedTime,
          actionId,
          appointmentsConfiguration,
          identifier,
          userData,
          "create",
          env,
        );

        if (!availability.success) {
          throw new FeedbackError({
            name: "FEEDBACK_ERROR",
            message: availability.error,
          });
        }
      }

      // Si las validaciones de la cita son correctas (se puede agendar a la hora y fecha propuesta) se procede a la actualización.
      const updatedActionResult = await updateOrDelete(
        actionId,
        functionArguments,
        appointmentDetails,
        type as "update",
        userData,
        env,
      );
      console.log("updeit: ", updatedActionResult);

      if (!updatedActionResult.success) {
        return updatedActionResult.error;
      }

      return updatedActionResult.data;
    }

    /*
    if (type === "cancel") {
      const deletedActionResult = await updateOrDelete(
        client,
        actionId,
        functionArguments,
        appointmentDetails,
        type as "cancel"
      );
      if (!deletedActionResult.success) {
        return deletedActionResult.error;
      }

      return deletedActionResult.data;
    }
     */
  } catch (error) {
    if (error instanceof FeedbackError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: false, error: `Ha ocurrido un error inesperado` };
  }
}
