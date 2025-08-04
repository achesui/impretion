import { neon } from "@neondatabase/serverless";
import { Context } from "hono";
import {
  ConnectionSchema,
  ConnectionTypes,
  TemplateTypeProps,
} from "./twilio-types";
import { twilioClient } from "./client";
import { twiml } from "twilio";
import { createMessage } from "../../create-message";
import { GetConnectionResponse } from "@core-service/types";
import { ServiceResponse } from "../../../../global";

export async function whatsappIncomingMessage(c: Context<{ Bindings: Env }>) {
  try {
    console.log("...........");
    const connectionType = c.req.query("connectionType") as ConnectionTypes;
    const formData = await c.req.formData();

    console.log("datos del form: ", formData);
    const from = String(formData.get("From")).split("whatsapp:")[1];
    const to = String(formData.get("To")).split("whatsapp:")[1];
    const message = String(formData.get("Body"));
    console.log(message);

    // Si es organizacional se debe obtener el usuario desde el "to" (el número de destino de la empresa recibiendo número de sus clientes).
    // Si es directa se debe obtener el usuario desde el "from", (el número del usuario escribiendole a el número de impretion).
    // Esta conexión unicamente sirve para obtener el cache de la conexión actual si existe.
    const connection = connectionType === "direct" ? from : to;

    // Los números son obtenidos según la conexión ya que estos no se pueden repetir entre organizaciones, no es necesario filtrarlos por org.
    // Estos retornan el 'organizationId' y esta puede usarse para instanciar el mensaje entrante junto con una organización.
    const connectionResponse = await c.env.CORE_SERVICE.mainDatabaseHandler({
      type: "connections",
      query: {
        method: "getConnections",
        data: {
          filterByConnectedWith: connection,
          withSubscriptions: true,
        },
      },
      userData: {
        organizationId: "",
      },
    });

    // Si no existe ninguna conexión con este número entonces enviar un mensaje de error. Se para el flujo, no hay ninguna respuesta.
    if (!connectionResponse.success) throw new Error();

    const [connectionData] = connectionResponse.data as GetConnectionResponse[];

    // Si no hay ninguna conexión no debe suceder nada.
    if (!connectionData) {
      return;
    }

    await c.env.GENERATOR_SERVICE.generation({
      connectionType: connectionData.type,

      // Identificador del mensaje único por organización para evitar colisiones si el usuario interactua con otra organización con el mismo número.
      // El organizationId sirve para conexiones de tipo organizacionales, sin embargo, para las directas parece buena practica aunque no afecte en nada.
      from: `${from}-${connectionData.organizationId}-${connectionData.type}`,

      // Receptor del mensaje que se esta enviando.
      to: connection,

      // Mensaje enviado por el usuario.
      message,

      isInternal: false,

      // Las conexiones pueden estar suscritas tanto a acciones (direct) como a asistentes (organizational, que en el futuro puede ser agentico).
      subscriptions: connectionData.subscriptions || [],

      userData: {
        organizationId: connectionData.organizationId,
        userId: connectionData.createdBy,
      },
      source: "whatsapp",
    });

    /*
      // Si la conexión es organizacional agregamos el 'from' es decir, el número del usuario enviando el mensaje.
      if (connectionType === "organizational") {
        dataToCache.from = from;
      }
      await c.env.GLOBAL_CACHE.put(connection, JSON.stringify(dataToCache), {
        expirationTtl: 1800,
      });

      getConnectionData = dataToCache;
    }


    const {
      connectedWith,
      organizationId,
      subscribedToAssistant,
      userId,
      directConnections,
    } = getConnectionData;

    const newGeneration = await c.env.GENERATOR_SERVICE.add({
      connectedWith,
      connectionType,
      from,
      isInternal: false,
      message,
      organizationId,
      subscribedToAssistant,
      userId,
      directConnections,
      source: "whatsapp",
    });

    const twimlResponse = new twiml.MessagingResponse();

    if (!newGeneration.success) {
      twimlResponse.message(
        "Ha ocurrido un error, por favor intentalo nuevamente."
      );
    } else {
      twimlResponse.message(newGeneration.data.content);
    }

    c.header("Content-Type", "text/xml");
    return c.body(twimlResponse.toString());
    */
    return c.json({}, 200);
  } catch (error) {
    console.error("Error: ", error);
    return c.json({ success: false, error }, 500);
  }
}

export async function verification(
  c: Context<{ Bindings: Env }>,
  twilioTemplateMessages: (
    props: TemplateTypeProps
  ) => Promise<ServiceResponse<string, any>>
) {
  const body = await c.req.json();
  const { to } = body;
  console.log(".,. ", to);

  const response = await twilioTemplateMessages({
    category: "verifications",
    type: "verification",
    data: {},
    from: "",
    to,
    connectionType: "direct",
  });

  console.log("respuesta => ", response);

  if (!response.success) {
    console.error("Failed to send verification:", response.error);
    return c.json(
      {
        success: false,
        error: response.error || "Failed to send verification",
      },
      500
    );
  }

  console.log("RESPUESTICA => : ", response);
  return c.json(response);
}

export async function verificationValidation(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json();
  const { to, code } = body;
  const verificationCode = await c.env.SYSTEM_CACHE.get(
    `direct-connection-verification-code-${to}`
  );

  if (verificationCode === code) {
    return c.json({
      success: true,
      data: verificationCode,
    });
  }

  return c.json(
    {
      success: false,
      error: "El código de verificación es incorrecto o ya venció.",
    },
    500
  );
}
