import {
  ActionQueryError,
  FeedbackError,
  OpenAIChatCompletionsError,
} from "../../../../lib/errors";
import { getDatePart, getDayOfTheWeek, trimIndentation } from "../../../utils";
import {
  AIGatewayMetadata,
  AppointsmentsConfiguration,
  ChatCompletionsHelpers,
  UserData,
} from "../../../../src/types";
import { GetActionResultsResponse } from "@core-service/types";
import { newGeneration } from "../../../../lib/generation-handler/new-generation";
import {
  getDatabaseScheduledAppointments,
  getSchedules,
} from "./scheduled-appointments-handler";
import { ServiceResponse } from "@base/shared-types";

type AppointmentAvailabilityCheckResponse = {
  isBookeable: boolean;
  bookingRecommendations: string[];
  maxAppointmentsExceeded: boolean;
  unavailableReason: string;
};

export const getAvailability = async <TAgentContext>(
  stateHelpers: ChatCompletionsHelpers<TAgentContext>,
  proposedDate: string,
  proposedTime: { startTime: string; endTime: string },
  actionId: string,
  appointmentsConfiguration: AppointsmentsConfiguration,
  from: string,
  to: string,
  userData: UserData,
  operationType: "create" | "update" = "create",
  env: Env,
): Promise<ServiceResponse<AppointmentAvailabilityCheckResponse, string>> => {
  try {
    if (!proposedDate)
      throw new FeedbackError({
        name: "FEEDBACK_ERROR",
        message: `No se ha proporcionado una fecha para mirar la disponibilidad. Pidele al usuario que proporcione una fecha.`,
      });

    const { schedule, maxAppointmentsPerDay, slotInterval, integrations } =
      appointmentsConfiguration;

    // Extraer solo los campos "hour" y "date" de los resultados filtrados.
    const actionIntegrations =
      integrations && integrations.value ? integrations.value : [];

    const scheduledAppointments = await getSchedules(
      proposedDate,
      actionIntegrations,
      actionId,
      userData,
      env,
    );
    console.log("scheduledAppointments -> ", scheduledAppointments);

    console.log("appt config -> ", appointmentsConfiguration);
    const isAuto = maxAppointmentsPerDay.value.isAuto;
    console.log("is auto ", isAuto);
    const maxAppointments = maxAppointmentsPerDay.value.value;
    console.log("max appt ", maxAppointments);

    // Obtiene el dia actual: Ejemplo: "lunes"
    const dayOfTheWeek = getDayOfTheWeek(proposedDate);

    // Obtiene el dia de la semana de la configuración
    const scheduleDay = schedule.value[dayOfTheWeek];
    console.log("schedule day -> ", scheduleDay);
    if (!scheduleDay.isEnabled) {
      throw new FeedbackError({
        name: "FEEDBACK_ERROR",
        message: `El día ${dayOfTheWeek} no está habilitado para agendar citas.`,
      });
    }

    const { startTime, endTime } = scheduleDay;

    /* VALIDACIÓN DE CITAS MAXIMAS */
    // Número de citas asignadas y validación de citas máximas.
    // Si es una actualización, ignoramos la validación y seguimos con la ejecución.
    // Únicamente validamos esto si "isAuto" es falso. Ya que quiere decir que no hay citas máximas.
    if (
      !isAuto &&
      scheduledAppointments.length > maxAppointments &&
      operationType === "create"
    ) {
      throw new FeedbackError({
        name: "FEEDBACK_ERROR",
        message:
          "Limite de citas máximas por día excedido. **Instrucciones del asistente:** Pidele al usuario que intente con otra fecha.",
      });
    }

    // Procesamiento de citas automatico segun el intervalo con la formula: lapso de minutos entre startTime y endTime / (dividido) entre slotInvertal.
    if (isAuto) {
      // Dividir las horas en componentes
      const [h1, m1] = startTime.split(":").map(Number);
      const [h2, m2] = endTime.split(":").map(Number);

      // Convertir a minutos totales
      const startTimeMinutes = h1 * 60 + m1;
      const endTimeMinutes = h2 * 60 + m2;

      // Calcular diferencia absoluta
      const minuteDifference = Math.abs(endTimeMinutes - startTimeMinutes);
      // Número de citas calculadas
      const maxAppointmentsCalculated = minuteDifference / slotInterval.value;

      if (scheduledAppointments.length > maxAppointmentsCalculated) {
        throw new FeedbackError({
          name: "FEEDBACK_ERROR",
          message:
            "Parece que la hora esta fuera del rango laboral. **Instrucciones del asistente:** Pidele al usuario que intente con otra fecha.",
        });
      }
    }

    const userPrompt = JSON.stringify({
      CONFIGURATION: {
        startTime,
        endTime,
        slotInterval,
      },
      PROPOSED_TIME: proposedTime,
      PROPOSED_DATE: proposedDate,
      ASSIGNED_APPOINTMENTS: scheduledAppointments,
    });

    console.log("PROMPT DE USUARIO => ", userPrompt);
    const response = await newGeneration({
      stateHelpers,
      env,
      body: {
        connectionType: "agentic",
        message: userPrompt,
        from,
        to,
        userData,
        isInternal: true,
        source: "checkAppointmentsAvailability",
        subscriptions: [],
      },
      models: ["openai/gpt-4.1"],
    });

    console.log("LA RESPUESTAH ---=> ", response);

    if (!response.success) {
      throw new OpenAIChatCompletionsError({
        name: "REQUESTING_COMPLETATION_ERROR",
        message:
          "Ha ocurrido un error al determinar la disponibilidad de las citas. **Vuelve a pedirle los datos requeridos al usuario.**",
      });
    }

    const appointmentsCheckResult = JSON.parse(
      response.data.content,
    ) as AppointmentAvailabilityCheckResponse;

    console.log("appointmentsCheckResult => ", appointmentsCheckResult);
    // Extrae las propiedades del objeto parseado.
    const {
      isBookeable,
      bookingRecommendations,
      maxAppointmentsExceeded,
      unavailableReason,
    } = appointmentsCheckResult;

    console.log("isBookeable => ", isBookeable);
    console.log("bookingRecommendations => ", bookingRecommendations);

    // Si no hay disponibilidad, se retorna la lista de citas disponibles
    if (!isBookeable) {
      let message = "";

      if (bookingRecommendations.length > 0) {
        message += trimIndentation(`
				**Sugerencias:** Ofrece al usuario las siguientes opciones de horario: [{${bookingRecommendations.join(
          ", ",
        )}}]. **También permite que el usuario elija libremente un horario que le resulte conveniente.**.`);

        if (scheduleDay.isEnabled) {
          message += `**Instrucciones para el asistente:** Recuerda SIEMPRE al usuario que el horario para agendar citas es de ${
            scheduleDay.startTime
          } a ${scheduleDay.endTime} para el día ${dayOfTheWeek} ${getDatePart(
            proposedDate,
            "day",
          )} de ${getDatePart(proposedDate, "month")}.`;
        }
      }

      if (unavailableReason) {
        message += `La razón de la no disponibilidad es: ${unavailableReason}. `;
      }

      if (maxAppointmentsExceeded) {
        message += `Se ha alcanzado el máximo de citas permitidas para el día. **pidele al usuario que elija otro día.**`;
      }

      // Si no hay ningún mensaje, se puede agregar un mensaje por defecto.
      if (!message) {
        message = "No hay citas disponibles en este momento.";
      }

      return { success: false, error: message };
    }

    // Si todo funciona correctamente, se retorna el objeto con los datos y algunas recomendaciones.
    return {
      success: true,
      data: {
        isBookeable,
        bookingRecommendations,
        maxAppointmentsExceeded,
        unavailableReason,
      },
    };
  } catch (error) {
    // Los mensajes de error de las clases de error son solo para fines de depuración. Siempre se debe retornar un mensaje de error estándar al asistente.
    console.error(error);

    // Los mensajes de feedback son mensajes que se le muestran al usuario final, por lo que deben ser amigables y claros.
    if (error instanceof FeedbackError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof ActionQueryError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error:
        "Ha ocurrido un error en el sistema, **Pidele al usuario que lo intente nuevamente.**",
    };
  }
};
