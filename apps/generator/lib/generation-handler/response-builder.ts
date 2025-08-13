import { ServiceResponse, UserData } from "@base/shared-types";
import {
  ChatCompletionProps,
  ChatCompletionsHelpers,
  DurableObjectSQL,
  UserMessageState,
} from "../../src/types";
import { conversationHandler } from "../conversation-handler";

/**
 * Estos son los datos que se pasan al servicio eg: whatsapp.
 * category: Es la acción que disparo el evento, puede ser una acción organizacional o una simple respuesta ('default')
 */
type ChannelServicesData = {
  responseMetadata: Record<string, any>;
  category: "default" | "appointments";
  data: Record<string, any> | string;
  connectionType: string;
  type: string;
};

type ResponseBuilderProps<TAgentContext> = {
  sql: DurableObjectSQL;
  userData: UserData;
  source: string;
  channelPayload: ChannelServicesData;
  from: string;
  to: string;
  messages: {
    userMessage: string;
    // Si es un objeto son datos que se procesaran de cierto source y se retornara como string, conversationHandler ÚNICAMENTE acepta string.
    assistantMessage: string | Record<string, any>;
  };
  timestamps: {
    userMessageTimestamp: Date;
    assistantMessageTimestamp: Date;
  };
  stateHelpers: ChatCompletionsHelpers<TAgentContext>;
  model: string;
  env: Env;
};

const model = "openai/gpt-4.1-mini";
export async function responseBuilder<TAgentContext>({
  sql,
  userData,
  source,
  channelPayload,
  from,
  to,
  messages,
  timestamps,
  stateHelpers,
  model,
  env,
}: ResponseBuilderProps<TAgentContext>): Promise<
  ServiceResponse<
    {
      content: string | Record<string, any>;
      model: string;
      timestamps: {
        userMessageTimestamp: Date;
        assistantMessageTimestamp: Date;
      };
    },
    any
  >
> {
  const { category, data, type, responseMetadata, connectionType } =
    channelPayload;
  const { cancelSchedule, schedule, setState, state } = stateHelpers;
  const { assistantMessage, userMessage } = messages;

  switch (source) {
    // Si el "source" es whatsapp,
    case "whatsapp":
      const { actionType } = responseMetadata;

      console.log("x ", from);
      const response = await env.CHANNEL_SERVICES.twilioTemplateMessages({
        category: category as any,
        type: type as any,
        data,
        from,
        to,
        connectionType,
      });

      console.log(response);

      if (!response.success) throw new Error();

      await conversationHandler<TAgentContext>({
        sql,
        userData,
        stateHelpers,
        userMessage,
        assistantMessage: assistantMessage as string,
        timestamps,
        env,
      });

      /**
       * actionType viene directamente de los metadatos de la acción (responseMetadata).
       * - Si se creo una nueva cita es decir "actionType" es "create" si hay alguna conexión directa a esta acción se notifica la cita.
       * - Se agrega en el "actionState" los datos de la cita, esto permite tener control de las acciones guardadas del usuario.
       * - Recordatorio de la cita al usuario 24 horas antes de su cita únicamente si el tiempo de la cita es mayor a 24 horas.
       */
      if (actionType === "create") {
        // Si esta actionType eso quiere decir que "data" proviene de una acción por lo que no es un string si no un Record.
        const actionChannelData = data as Record<string, any>;

        // Aquí se debe buscar cuales son las conexiones apartir de el "actionId" en la tabla "connection_subscriptions".
        // Apartir de los datos retornados obtenemos el "connectedWith" el cual es el número suscrito a esta acción.

        // Programación del schedule que notificara al usuario cuando falten 24h para las cita.
        const scheduledAppointmentReminder = await schedule(
          15,
          "createSchedule" as keyof TAgentContext,
          {
            type: "appointmentReminder",
            data: {
              name: actionChannelData.name,
              phone: actionChannelData.phone,
              date: actionChannelData.date,
              time: actionChannelData.time,
            },
            source,
          },
        );

        /*
        // Creación del estado de la acción.
        setState({
          ...state,
          actionState: {
            appointments: [
              {
                appointmentCode: actionChannelData.code,
                appointmentDate: actionChannelData.date,
                appointmentTime: actionChannelData.time,
                scheduleCode: scheduledAppointmentReminder.id,
              },
            ],
          },
        });
         */
      }

      return {
        success: true,
        data: { content: "response.data", model, timestamps },
      };

    case "chatbot":
      console.log("respouesta de sitio web =< ", messages);

      await conversationHandler<TAgentContext>({
        sql,
        userData,
        stateHelpers,
        userMessage,
        assistantMessage: assistantMessage as string,
        timestamps,
        env,
      });

      return {
        success: true,
        data: { content: assistantMessage, model, timestamps },
      };

    default:
      await conversationHandler({
        sql,
        userData,
        stateHelpers,
        userMessage,
        assistantMessage: assistantMessage as string,
        timestamps,
        env,
      });
      return {
        success: true,
        data: { content: assistantMessage, model, timestamps },
      };
  }
}
