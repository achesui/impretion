// templates/appointments.ts
import { twilioClient } from "./client";
import {
  cleanIndentation,
  formatDate,
  formatPhone,
  formatTime,
} from "../../utils";
import { Twilio } from "twilio";
import { SubaccountTokens } from "./twilio-types";

export const appointmentHandlers = {
  // Template de meta requerido
  newAppointmentNotification: async (
    env: Env,
    data: { name: string; date: string; time: string },
    from: string,
    to: string,
    connectionType: string,
  ) => {
    const { time, date } = data;
    const message = cleanIndentation(`
📅 *NUEVA CITA AGENDADA*

⏳ Fecha: ${formatDate(date)}
⏰ Hora: ${formatTime(time)}

👤 INFORMACIÓN DEL USUARIO:
- Nombre: ${data.name}
- Teléfono: ${formatPhone(phone)}`);

    await twilioClient(env).messages.create({
      from: "whatsapp:+14155238886",
      to: `whatsapp:+573146816140`,
      body: message,
    });
    return message;
  },

  // Template de meta requerido
  appointmentReminder: async (
    env: Env,
    data: { name: string; date: string; time: string },
    from: string,
    to: string,
    connectionType: string,
  ) => {
    const message = `
¡Hola ${data.name}! 😊

Solo para recordarte que mañana tienes tu cita odontológica:

🗓️ ${formatDate(data.date)} a las ${formatTime(data.time)}


¡Nos vemos pronto! ✨
`.trim();

    await twilioClient(env).messages.create({
      from: "whatsapp:+14155238886",
      to: `whatsapp:+57${phone}`,
      body: message,
    });
    return true;
  },

  appointmentDetails: async (
    env: Env,
    data: {
      email: string;
      name: string;
      date: string;
      time: string;
      status: string;
      code: string;
    },
    phone: string,
  ) => {
    const statusDots: Record<string, string> = {
      pending: "🟡 Tu cita está pendiente.",
      completed: "🟢 Tu cita fue realizada.",
      canceled: "🔴 Tu cita fue cancelada.",
    };

    const message = cleanIndentation(`📅 *Detalles de tu cita*

${formatDate(data.date)} a las ${formatTime(data.time)}
👤 ${data.name}
📧 ${data.email}
📱 ${phone}
${statusDots[data.status] || "⚪"}`);

    await twilioClient(env).messages.create({
      from: "whatsapp:+14155238886",
      to: `whatsapp:+57${phone}`,
      body: message,
    });
    return true;
  },

  createdAppointment: async (
    env: Env,
    data: {
      email: string;
      name: string;
      date: string;
      time: string;
      code: string;
    },
    phone: string,
  ) => {
    const message = cleanIndentation(`
📅 *TU CITA HA SIDO AGENDADA*

⏳ Fecha: ${formatDate(data.date)}
⏰ Hora: ${formatTime(data.time)}

👤 INFORMACIÓN DEL USUARIO:
- Nombre: ${data.name}
- Email: ${data.email}
- Teléfono: ${formatPhone(phone)}

🟢 Puedes usar el código *${data.code}* para actualizar o cancelar tu cita.`);

    await twilioClient(env).messages.create({
      from: "whatsapp:+14155238886",
      to: `whatsapp:+573146816140`,
      body: message,
    });
    return true;
  },
};

// Códigos de verificación los tokens de subaccount si deben ser los de "impretion" en Twilio.
export const verificationHandlers = {
  verification: async (
    env: Env,
    data: string,
    subaccountTokens: SubaccountTokens,
    from: string,
    to: string,
  ) => {
    const code = Array.from(
      { length: 6 },
      () => Math.floor(Math.random() * 9) + 1,
    ).join("");

    const twilio = await twilioClient(subaccountTokens);

    console.log("to => ", to);
    console.log("from => ", from);
    console.log("code => ", code);
    const twilioInstance = await twilio.messages.create({
      from: "whatsapp:+573233311171", // "whatsapp:+14155238886" - "whatsapp:+573233311171" <- prod
      contentSid: "HX8b747b69d3fc62e95446ea8457234197", // HX68e26837d0e6e3343e64a7c0b1db425f - HX8b747b69d3fc62e95446ea8457234197 <- prod
      contentVariables: JSON.stringify({ 1: code }),
      to: `whatsapp:${to}`,
    });
    console.log("instancia de twilio => ", twilioInstance);

    // Se guarda el código de verificación en un KV el cual expira luego de 900 segundos.
    await env.SYSTEM_CACHE.put(
      `direct-connection-verification-code-${to}`,
      code,
      {
        expirationTtl: 900,
      },
    );

    return true;
  },
};

export const defaultHandlers = {
  commonMessage: async (
    env: Env,
    data: string,
    subaccountTokens: SubaccountTokens,
    from: string,
    to: string,
  ): Promise<boolean> => {
    try {
      const { accountSid, authToken } = subaccountTokens;
      console.log("datos de la subcuenta: ", accountSid, authToken);

      // Validar que tenemos los datos necesarios
      if (!accountSid || !authToken) {
        throw new Error(
          "accountSid y authToken son requeridos para enviar mensajes",
        );
      }

      if (!data || !from || !to) {
        throw new Error("data, from y to son requeridos para enviar mensajes");
      }

      const decryptedAuthTokenResponse =
        await env.CRYPTO_SERVICE.symmetricOperation({
          action: "decrypt",
          data: authToken,
        });

      if (
        !decryptedAuthTokenResponse.success ||
        !decryptedAuthTokenResponse.data
      ) {
        throw new Error(
          "Error desencriptando el token desde los metadatos de la subacountgit de Twilio al enviar un mensaje común.",
        );
      }

      console.log(
        "acc tokens => ",
        accountSid,
        decryptedAuthTokenResponse.data,
      );

      const twilio = twilioClient({
        accountSid,
        authToken: decryptedAuthTokenResponse.data,
      });

      console.log("instancia de twilio : ", twilio);

      console.log("message pairs : ", "from:", from, "to:", to, "data:", data);

      // CORRECCIÓN PRINCIPAL: El 'from' debe ser tu número de WhatsApp Business (to en tus parámetros)
      // y el 'to' debe ser el número del usuario (from en tus parámetros)
      const twilioMessage = await twilio.messages.create({
        from: `whatsapp:${to}`,
        to: `whatsapp:${from}`,
        body: data,
      });

      console.log("twilio message: ", twilioMessage);

      // Verificar que el mensaje fue enviado correctamente
      if (!twilioMessage.sid) {
        throw new Error("El mensaje no pudo ser enviado, no se recibió SID");
      }

      return true;
    } catch (error) {
      console.error("Error en mensaje común de Twilio: ", error);

      // Re-lanzar el error para que pueda ser manejado por el código que llama a esta función
      throw error;
    }
  },
};
