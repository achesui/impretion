import { Hono } from "hono";
import { Agent, getAgentByName } from "agents";
import { DurableObject, WorkerEntrypoint } from "cloudflare:workers";
import { newGeneration } from "../lib/generation-handler/new-generation";
import {
  GenerationResponse,
  GenerationProps,
  ScheduleQueryProps,
  UserMessageState,
  ProcessGenerationProps,
} from "./types";
import { scheduleType } from "../lib/schedule-handler";
import { SelectIntegrationSchema } from "@core-service/types";
import {
  getSchedules,
  integrationsHandler,
} from "../services/functions/appointment/utils/scheduled-appointments-handler";
import { addOrSubstractFromDate } from "../services/utils";
import { ServiceResponse } from "@base/shared-types";

/*
 * Gestor de estados globales.
 * Maneja los estados de las acciones entre otros estados existentes.
 */
export class GlobalStateHandler extends DurableObject {
  async fetch(request: Request) {
    return new Response("Hello, world!");
  }
}

export class AssistantMessageWrapper extends Agent<Env, UserMessageState> {
  initialState: UserMessageState = {
    conversationContext: [],
    fullConversationContext: [],
  };

  async processGeneration(
    body: GenerationProps,
  ): Promise<ServiceResponse<{ content: string; model: string }, null>> {
    const result = await newGeneration({
      stateHelpers: {
        schedule: this.schedule.bind(this),
        cancelSchedule: this.cancelSchedule.bind(this),
        state: this.state,
        setState: this.setState.bind(this),
      },
      env: this.env,
      body,
    });

    if (!result.success) {
      return { success: false, error: null };
    }

    return { success: true, data: result.data };
  }

  async createSchedule(
    query: ScheduleQueryProps,
  ): Promise<ServiceResponse<any, any>> {
    return await scheduleType(query, this.env);
  }
}

export default class GeneratorService extends WorkerEntrypoint<Env> {
  private app = new Hono<{ Bindings: Env }>();

  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env);
    this.setupRoutes();
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request, this.env, this.ctx);
  }

  private setupRoutes() {
    this.app.post("/new-gen", async (c) => {
      console.log("🎯 Entrando a /new-gen");

      try {
        const body = await c.req.json<GenerationProps>();
        const x = await this.generation(body);

        return c.json(x);
      } catch (error) {
        console.error("❌ Error en /new-gen:", error);
        return c.json({ error: "Error interno del servidor" }, 500);
      }
    });

    // Ruta para manejar cualquier otro endpoint
    this.app.all("*", (c) => {
      console.log("🔍 Ruta no encontrada:", c.req.method, c.req.url);
      return c.json({ error: "Ruta no encontrada" }, 404);
    });
  }

  async generation(
    props: GenerationProps,
  ): Promise<ServiceResponse<GenerationResponse, string>> {
    //console.log("🔄 Procesando en método add:", props);
    try {
      const { from } = props;

      // El 'from' que proviene de un canal comunmente tiene la estructura: from-organizationId-connectionType
      // Donde 'organizationId' y 'connectionType' se utilizan para obtener el estado correcto del usuario que se esta comunicando.
      const namedAgent = await getAgentByName<Env, AssistantMessageWrapper>(
        this.env.ASSISTANT_WRAPPER,
        from as string,
      );

      // Obtiene únicamente el 'from' sin 'organizationId'/'connectionType'
      const filteredFrom = from.split("-")[0];

      const data = { ...props, from: filteredFrom };

      const processedGeneration = await namedAgent.processGeneration(data);

      if (!processedGeneration.success) {
        return {
          success: false,
          error: "Ha ocurrido un error en la generación.",
        };
      }

      console.log("datos: ", processedGeneration);

      return { success: true, data: processedGeneration.data };
    } catch (error) {
      console.error("errorzaum => ", error);
      return { success: false, error: "" };
    }
  }
}
