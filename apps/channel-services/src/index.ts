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
import { ServiceResponse } from "../../global";
import { organizationalConnectionHandler } from "../lib/organizational-connection-handler";
import { twilioClient } from "../lib/handlers/twilio/client";
import { GetConnectionResponse } from "@core-service/types";

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
      verificationValidation(c)
    );

    this.app.post("/channels/twilio/whatsapp", (c) =>
      whatsappIncomingMessage(c)
    );

    /*
    this.app.post("/test", async (c) => {
      const newGeneration = await this.env.GENERATOR_SERVICE.add({
        connectionType: "organizational",
        connectedWith: "+14155238886",
        subscribedToAssistant: "738b613d-98f0-4e5d-9d61-6e39ba72af8d",
        organizationId: "org_DzftKnkKWAueTvpR",
        userId: "google-oauth2|103923806057449768456",
        message:
          "agendame una cita ya mismo el 8 de julio a las 4:20pm sebastian, sebas@gmail.com 3216541321",
        isInternal: false,
        from: "+573146816140",
        directConnections: [""],
        source: "web",
      });
      // el 8 de julio a las 4pm sebastian, sebas@gmail.com 3216541321
      if (!newGeneration.success) {
        console.error("Failed to add new generation:", newGeneration.error);
        return c.json(
          {
            success: false,
            error: newGeneration.error || "Failed to add generation",
          },
          500
        );
      }

      console.log(newGeneration);
      return c.json({});
    });
     */
  }

  async twilioTemplateMessages(
    props: TemplateTypeProps
  ): Promise<ServiceResponse<string, any>> {
    return await templateHandler(props, this.env);
  }

  // Flujos de conexión a aplicaciones terceras según la conexión ORGANIZACIONAL. ej: Twilio.
  async organizationalConnectionFlow(
    props: OrganizationalTypeConnectionFlow
  ): Promise<ServiceResponse<{}, string>> {
    try {
      console.log("En el flow: ", props);
      const organizationalResponse = await organizationalConnectionHandler(
        props,
        this.env
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
