import { WorkerEntrypoint } from "cloudflare:workers";
import {
  verification,
  verificationValidation,
  whatsappIncomingMessage,
} from "../lib/handlers/twilio/endpoints";
import { templateHandler } from "../lib/handlers/twilio/template-handler";
import { Hono } from "hono";
import {
  OrganizationalTypeConnectionFlow,
  SubaccountTokens,
  TemplateTypeProps,
} from "../lib/handlers/twilio/twilio-types";
import { organizationalConnectionHandler } from "../lib/organizational-connection-handler";
import { twilioClient } from "../lib/handlers/twilio/client";
import { ServiceResponse } from "@base/shared-types";
import { cors } from "hono/cors";
import {
  GetAssistantsResponse,
  GetConnectionResponse,
} from "@core-service/types";
import { chatbotIncomingMessage } from "../lib/handlers/chatbot/endpoints";

export default class ChannelServices extends WorkerEntrypoint<Env> {
  private app = new Hono<{ Bindings: Env }>();

  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env);
    this.setupRoutes();
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request, this.env, this.ctx);
  }

  private setupRoutes() {
    this.app.use(
      "*",
      cors({
        origin: "*",
        credentials: true,
      }),
    );

    /**
     * Manejo del renderizado del chatbot en sitios web.
     * initial: Endpoint inicial para la obtención de la configuración (historial, colores, etc..).
     */
    this.app.get("/channels/website/initial", async (c) => {
      try {
        const { session, token, host } = c.req.query();
        console.log(
          "🎯 Entrando a /channels/website/initial",
          session,
          token,
          host,
        );

        // Validar que tengas session y token
        if (!session || !token) {
          return c.json(
            {
              error: "Session y token son requeridos",
            },
            400,
          );
        }

        // Obtención de datos de la conexión por medio del connectedWith.
        const getConnectionResponse =
          await this.env.CORE_SERVICE.mainDatabaseHandler({
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

        console.log("METADATOS => ", getConnection);
        // Validación de conexión:

        // Obtención de datos de la conexión.
        const { metadata, connectedWith, subscriptions, organizationId } =
          getConnection;
        const { token: retrievedToken } = metadata as { token: string };

        // 0. Validar si existe un token en la conexión.
        if (!retrievedToken)
          throw new Error("No se encontró un token en la conexión.");

        // 1. Verifica si el token pasado es igual a el token que se encuentra en el campo de los metadatos.
        if (token !== retrievedToken) throw new Error("El token no coincide.");

        // 2. Verifica si el host del chatbot haciendo la petición coincide con el de labase de datos.
        if (host !== connectedWith) throw new Error("El host no coincide.");

        // 3. Generación del JWT Token para el usuario.

        // Obtención de datos del asistente suscrito a este chatbot.
        const assistantId =
          subscriptions && (subscriptions[0].assistantId as string);

        const getAssistantByIdResponse =
          await this.env.CORE_SERVICE.mainDatabaseHandler({
            type: "assistants",
            query: {
              method: "getAssistants",
              data: {
                id: assistantId,
                withLinkedActions: true,
              },
            },
            userData: {
              organizationId,
            },
          });

        if (!getAssistantByIdResponse.success) {
          throw new Error("No se pudo obtener el asistente.");
        }

        const [getAssistantById] =
          getAssistantByIdResponse.data as GetAssistantsResponse;

        const linkedAssistantActions =
          getAssistantById?.linkedActions &&
          (getAssistantById?.linkedActions.map(
            (action) => action.action.type,
          ) as any);

        // Obtención del historial y detalles del usuario con la nomenclatura from-organizationId-connectionType.
        const objectDataResponse =
          await this.env.GENERATOR_SERVICE.getObjectStateData({
            from: `${session}-${organizationId}-organizational`,
          });

        console.log("objectDataResponse ===> ", objectDataResponse);

        if (!objectDataResponse.success)
          throw new Error(
            "Ha ocurrido un error obteniendo los datos del usuario.",
          );

        // 4. Generación del JWT Token para el usuario.;

        // Aquí deberías obtener la configuración real según el token

        // Configuración final del chatbot.
        const chatbotConfiguration: {
          linkedAssistantActions: string[];
          baseColor: number; // el ID del color base, este se obtiene en un objeto dentro del widget del chatbot.
          greetings: string;
          welcomeMessage: string;
          initialConversation: {
            role: string;
            content: string;
            timestamp: Date;
          }[];
        } = {
          linkedAssistantActions,
          baseColor: 1,
          greetings: "Ahora comprar es mucho más fácil!",
          welcomeMessage: "Buenas como te puedo ayudar!",
          initialConversation: objectDataResponse.data.lastConversationMessages,
        };

        return c.json(chatbotConfiguration, 200);
      } catch (error) {
        console.error("Error en /channels/website/initial:", error);
        return c.json(
          {
            error: "Error interno del servidor",
          },
          500,
        );
      }
    });
    this.app.post("/channels/website/message", async (c) => {
      return chatbotIncomingMessage(c);
    });

    /**
     * Endpoints necesarios para el funcionamiento de whatsapp con el BSP Twilio
     * verification: permite crear un código apartir de un número para conexión directa.
     * verification-validation: valida el código que le llego a el usuario a su Whatsapp.
     * whatsapp-incoming-message: webhook que recibe los mensajes desde whatsapp.
     */
    this.app.post("/channels/twilio/verification", async (c) => {
      return await verification(c, this.twilioTemplateMessages.bind(this));
    });

    this.app.post("/channels/twilio/verification-validation", async (c) =>
      verificationValidation(c),
    );

    this.app.post("/channels/twilio/whatsapp", (c) =>
      whatsappIncomingMessage(c),
    );

    this.app.post("/test", async (c) => {
      const connectionFlowResponse = await this.organizationalConnectionFlow({
        provider: "twilio",
        data: {
          organizationId: "org_58SqXmTvvx8tmXoO",
          wabaId: "2142142129588165",
          assistantId: "bec62c3b-4140-48f9-b5c4-7985ae6285cf",
          phone: "+573147057550",
          businessName: "Impretion Consultorias",
          templateId: "HXb699065d365e6fdca7452b7ea4184a72",
        } as any,
        connectionId: "84c1122d-2572-48ea-90d5-5cb5155c45bb",
        userData: {
          organizationId: "org_58SqXmTvvx8tmXoO",
          userId: "google-oauth2|103923806057449768456",
        },
      });

      console.log("respuesta del flujo de conexion", connectionFlowResponse);
      return c.json({});
    });
  }

  async twilioTemplateMessages(
    props: TemplateTypeProps,
  ): Promise<ServiceResponse<string, any>> {
    return await templateHandler(props, this.env);
  }

  // Flujos de conexión a aplicaciones terceras según la conexión ORGANIZACIONAL. ej: Twilio.
  async organizationalConnectionFlow(
    props: OrganizationalTypeConnectionFlow,
  ): Promise<ServiceResponse<{}, string>> {
    try {
      console.log("En el flow: ", props);
      const organizationalResponse = await organizationalConnectionHandler(
        props,
        this.env,
      );
      console.log("organizationalResponse => ", organizationalResponse);
      return {
        success: true,
        data: {},
      };
    } catch (error) {
      return {
        success: false,
        error: "Ha ocurrido un error en el flujo de conexión organizacional.",
      };
    }
  }
}
