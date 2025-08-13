import { GetConnectionResponse } from "@core-service/types";
import { Context } from "hono";

export async function chatbotIncomingMessage(c: Context<{ Bindings: Env }>) {
  const { session, token, host } = c.req.query();
  const { message } = await c.req.json();
  try {
    if (!token) throw new Error("No se encontro un token.");

    // Obtención de datos de la conexión por medio del connectedWith.
    const getConnectionResponse = await c.env.CORE_SERVICE.mainDatabaseHandler({
      type: "connections",
      query: {
        method: "getConnections",
        data: {
          filterByConnectedWith: host,
          withSubscriptions: true,
        },
      },
      userData: {
        organizationId: "",
      },
    });

    if (!getConnectionResponse.success) {
      throw new Error("No se pudo obtener la conexión.");
    }

    const [getConnection] =
      getConnectionResponse.data as GetConnectionResponse[];

    const { organizationId, type, connectedWith, subscriptions, createdBy } =
      getConnection;

    const response = await c.env.GENERATOR_SERVICE.generation({
      connectionType: type,

      // Identificador del mensaje único por organización para evitar colisiones si el usuario interactua con otra organización con el mismo número.
      // El organizationId sirve para conexiones de tipo organizacionales, sin embargo, para las directas parece buena practica aunque no afecte en nada.
      from: `${session}-${organizationId}-${type}`,

      // Receptor del mensaje que se esta enviando.
      to: connectedWith,

      // Mensaje enviado por el usuario.
      message,

      // Marca de tiempo de envio de este mensaje. Requerido para algunas conexiones.
      timestamp: new Date(),

      isInternal: false,

      // Las conexiones pueden estar suscritas tanto a acciones (direct) como a asistentes (organizational, que en el futuro puede ser agentico).
      subscriptions: subscriptions || [],

      userData: {
        organizationId: organizationId,
        userId: createdBy,
      },
      source: "chatbot",
    });

    if (!response.success)
      throw new Error("Ha ocurrido un error enviando el mensaje.");

    const { content, timestamps } = response.data;

    return c.json({ content, timestamps }, 200);
  } catch (error) {
    throw new Error("Ha ocurrido un error enviando el mensaje.");
  }
}
