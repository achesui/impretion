import { ServiceResponse } from "../../global";
import { ScheduleHandlers, ScheduleQueryProps } from "../src/types";

export const scheduleHandlers: ScheduleHandlers = {
  appointmentReminder: async (env, data, source) => {
    const { name, phone, date, time } = data;

    console.log("reminder ?=??> ");
    try {
      switch (source) {
        case "whatsapp":
          // Lógica para recordatorio de cita
          console.log(`Recordatorio de cita para ${name}`);
          console.log(`Teléfono: ${phone}`);
          console.log(`Fecha: ${date} a las ${time}`);

          // Aquí iría tu lógica específica para recordatorios
          // Por ejemplo, enviar SMS, email, etc.
          const twilioReminder =
            await env.CHANNEL_SERVICES.twilioTemplateMessages({
              category: "appointments",
              type: "appointmentReminder",
              data: { name, phone, date, time },
              phone,
            });

          if (!twilioReminder.success) throw Error();

          return {
            success: true,
            message: twilioReminder.data,
          };

        case "test":
          console.log("recordatorio triggereado en la citia.. => ", data);
          return {
            success: true,
            message: `Recordatorio de prueba programado para ${name}`,
          };

        default:
          return {
            success: true,
            message: `Recordatorio programado para ${name}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error programando recordatorio: ${error}`,
      };
    }
  },
};

export async function scheduleType(
  query: ScheduleQueryProps,
  env: Env,
): Promise<ServiceResponse<any, any>> {
  try {
    console.log("la kueri =< ", query);
    const { method, data, source } = query;
    console.log("DATOS ==============> ", data, method, source);

    // Obtiene el handler correspondiente al método
    const handler = scheduleHandlers[
      method as keyof typeof scheduleHandlers
    ] as any;

    if (!handler) {
      return {
        success: false,
        error: `Método '${method}' no encontrado en scheduleHandlers`,
      };
    }

    // Ejecuta el handler pasando env, data Y source
    const result = await handler(env, data, source);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("ScheduleHandler: Error procesando schedule:", error);
    return {
      success: false,
      error: {
        name: "SCHEDULE_ERROR",
        message: "Error desconocido en scheduleHandler",
      },
    };
  }
}

/*

const templateHandlers: TemplateHandlers = {
    verification: async (env: Env, data: VerificationData) => {
        try {
            const twilio = twilioClient(env);
            const { codeLength = 6, to } = data;
            let code = "";

            for (let i = 0; i < codeLength; i++) {
                code += Math.floor(Math.random() * 9) + 1;
            }

            const message = await twilio.messages.create({
                from: 'whatsapp:+14155238886',
                contentSid: "HX229f5a04fd0510ce1b071852155d3e75",
                contentVariables: `{"1":"${code}"}`,
                to: `whatsapp:${to}`,
            });

            return true;
        } catch (error) {
            return false
        }
    },

    newAppointmentNotification: async (env: Env, data: NewAppointmentNotificationData) => {
        try {
            const { date, name, phone, time } = data;
            const notificationMessage = `
            📅 NUEVA CITA AGENDADA

            ⏳ Fecha: ${formatDate(date)}
            ⏰ Hora: ${formatTime(time)}

            👤 INFORMACIÓN DEL PACIENTE:
            • Nombre: ${name}
            • Teléfono: ${phone}

            ---
            🔔 Me pondre en contacto con el usuario 24 horas antes de la cita.
            `.trim();

            console.log(notificationMessage)
            // ENVIAR ESTO A TWILIO A EL NUMERO CONECTADO.

return true;
        } catch (error) {
    return false
}
    }
};

// Función principal usando Object Map
export async function templateType(
    template: TemplateTypeProps,
    env: Env
): Promise<ServiceResponse<any, any>> {
    const { type, data } = template;

    try {
        console.log(`Processing template type: ${type}`);

        // Acceso directo al handler con type assertion
        const handler = templateHandlers[type] as (env: Env, data: any) => Promise<any>;

        if (!handler) {
            throw new Error(`Template type "${type}" not supported`);
        }

        const result = await handler(env, data);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error(`Error processing template type "${type}":`, error);
        return {
            success: false,
            error: "Error inesperado."
        };
    }
}

*/
