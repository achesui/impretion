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
  GetDataProps,
  ConversationMessage,
} from "./types";
import { scheduleType } from "../lib/schedule-handler";
import { SelectIntegrationSchema } from "@core-service/types";
import {
  getSchedules,
  integrationsHandler,
} from "../services/functions/appointment/utils/scheduled-appointments-handler";
import { addOrSubstractFromDate } from "../services/utils";
import { ServiceResponse } from "@base/shared-types";
import { openRouter } from "../lib/openrouter/completion";
import {
  Message,
  OpenRouterResponse,
} from "../lib/openrouter/openrouter.types";

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
    lastConversationMessages: [],
    conversationState: {
      messageCount: 0,
      messageCountForSummarization: 0,
    },
  };

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.ctx.blockConcurrencyWhile(async () => {
      // Nos aseguramos la inicialización en cache por usuario.
      const initialized = await this.ctx.storage.get("_initialized");

      if (!initialized) {
        console.log("🚀 Primera inicialización del DO");
        await this.initializer();
        await this.ctx.storage.put("_initialized", true);
      }
    });
  }

  // Crea las tablas necesarias al iniciar el DO.
  async initializer() {
    // Tabla para almacenar la conversación completa.
    this.sql`
      CREATE TABLE IF NOT EXISTS full_conversation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Tabla para almacenar resúmenes de conversaciones para pasarle contexto a la IA.
    this.sql`
      CREATE TABLE IF NOT EXISTS conversation_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }

  // Maneja la generación de mensajes tanto agenticas como organizacional y directas (agentic, direct, organizational).
  async processGeneration(
    body: GenerationProps,
  ): Promise<ServiceResponse<GenerationResponse, null>> {
    const result = await newGeneration({
      stateHelpers: {
        sql: this.sql.bind(this),
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

    console.log("EL 1 => ", result.data);
    return { success: true, data: result.data };
  }

  // Obtiene datos únicamente provinientes del estado en objeto del usuario sin SQL.
  async getObjectState(): Promise<ServiceResponse<UserMessageState, any>> {
    try {
      console.log(await this.ctx.storage.get("state"));
      console.log(
        "CONVERSACION INICIAL ====>",
        this.state.lastConversationMessages,
      );

      return {
        success: true,
        data: this.state,
      };
    } catch (error) {
      return {
        success: false,
        error: "Error al obtener el estado del usuario",
      };
    }
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
    this.app.post("/new-getdata", async (c) => {
      console.log("🎯 Entrando a /new-gen");

      try {
        const body = await c.req.json<GenerationProps>();
        const x = await this.getObjectStateData(body);

        return c.json(x);
      } catch (error) {
        console.error("❌ Error en /new-gen:", error);
        return c.json({ error: "Error interno del servidor" }, 500);
      }
    });

    this.app.post("/test", async (c) => {
      console.log("🎯 Entrando a /test");
      try {
        const conversationContext = [
          {
            role: "system",
            content: "systemPrompt",
          },
          { role: "user", content: "message" },
        ] as Message[];

        const completion: OpenRouterResponse = await openRouter({
          env: c.env,
          messages: conversationContext,
          models: ["openai/gpt-4.1-mini"],
          responseFormat: {
            type: "json_schema",
            json_schema: {
              description:
                "Extrae estructuras de productos/servicios usando selectores universales que funcionen en cualquier sitio web, no específicos de framework.",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  page_context: {
                    type: "object",
                    properties: {
                      total_sections_found: {
                        type: "integer",
                        minimum: 0,
                      },
                      main_container_selectors: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },
                      page_type_indicators: {
                        type: "array",
                        items: {
                          type: "string",
                          enum: [
                            "e-commerce",
                            "services",
                            "pricing_plans",
                            "catalog",
                            "portfolio",
                            "marketplace",
                            "mixed",
                          ],
                        },
                      },
                      framework_indicators: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                        description:
                          "Indicios del framework detectado sin ser específicos (ej: 'react_based', 'cms_generated')",
                      },
                    },
                    required: [
                      "total_sections_found",
                      "main_container_selectors",
                      "page_type_indicators",
                    ],
                    additionalProperties: false,
                  },
                  item_structures: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        structure_id: {
                          type: "string",
                          pattern: "^[a-z0-9_]+$",
                          description:
                            "ID descriptivo universal (ej: 'main_products_grid', 'hero_featured_items')",
                        },
                        item_type_name: {
                          type: "string",
                        },
                        item_type_category: {
                          type: "string",
                          enum: [
                            "product",
                            "service",
                            "subscription_plan",
                            "course",
                            "portfolio_item",
                            "article",
                            "other",
                          ],
                        },
                        layout_pattern: {
                          type: "string",
                          enum: [
                            "grid_cards",
                            "list_items",
                            "pricing_table",
                            "carousel_slider",
                            "single_featured",
                            "tabs_content",
                            "accordion_items",
                          ],
                        },
                        confidence_score: {
                          type: "number",
                          minimum: 0,
                          maximum: 1,
                          description:
                            "Basado en universalidad del selector: 0.9+ = funciona en cualquier sitio, 0.5- = específico del sitio actual",
                        },
                        sample_count: {
                          type: "integer",
                          minimum: 1,
                        },
                        section_context: {
                          type: "object",
                          properties: {
                            section_selector: {
                              type: "string",
                              description:
                                "Selector universal del contenedor principal",
                            },
                            section_title: {
                              type: ["string", "null"],
                            },
                            section_semantic_role: {
                              type: "string",
                              enum: [
                                "main_products",
                                "featured_items",
                                "related_products",
                                "categories",
                                "services",
                                "pricing",
                                "other",
                              ],
                              description: "Rol semántico de la sección",
                            },
                          },
                          required: ["section_selector"],
                          additionalProperties: false,
                        },
                        container_selectors: {
                          type: "object",
                          properties: {
                            primary: {
                              type: "string",
                              description:
                                "Selector universal más robusto usando wildcards y estructura",
                            },
                            fallback: {
                              type: "string",
                              description: "Selector de respaldo genérico",
                            },
                            xpath: {
                              type: ["string", "null"],
                            },
                            selector_strategy: {
                              type: "string",
                              enum: [
                                "semantic_attributes",
                                "descriptive_classes",
                                "html_structure",
                                "content_patterns",
                                "mixed_approach",
                              ],
                            },
                            universality_score: {
                              type: "number",
                              minimum: 0,
                              maximum: 1,
                              description:
                                "¿Qué tan universal es este selector? 1.0 = funciona en cualquier sitio",
                            },
                          },
                          required: [
                            "primary",
                            "fallback",
                            "selector_strategy",
                            "universality_score",
                          ],
                          additionalProperties: false,
                        },
                        fields: {
                          type: "object",
                          properties: {
                            name: {
                              type: "object",
                              properties: {
                                selector: {
                                  type: "string",
                                },
                                attribute: {
                                  type: "string",
                                  default: "textContent",
                                },
                                fallback_selectors: {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                },
                                content_validation: {
                                  type: "object",
                                  properties: {
                                    min_length: {
                                      type: "integer",
                                      default: 2,
                                    },
                                    max_length: {
                                      type: "integer",
                                      default: 200,
                                    },
                                    excludes_patterns: {
                                      type: "array",
                                      items: {
                                        type: "string",
                                      },
                                      description:
                                        "Patrones regex de contenido a excluir (ej: '^\\\\s*$', '^[0-9]+$')",
                                    },
                                  },
                                  additionalProperties: false,
                                },
                                universality_score: {
                                  type: "number",
                                  minimum: 0,
                                  maximum: 1,
                                },
                              },
                              required: ["selector", "universality_score"],
                              additionalProperties: false,
                            },
                            price: {
                              type: "object",
                              properties: {
                                selector: {
                                  type: "string",
                                },
                                attribute: {
                                  type: "string",
                                  default: "textContent",
                                },
                                fallback_selectors: {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                },
                                content_validation: {
                                  type: "object",
                                  properties: {
                                    currency_patterns: {
                                      type: "array",
                                      items: {
                                        type: "string",
                                      },
                                      description:
                                        "Regex para detectar precios: ['\\\\$\\\\d+', '€\\\\d+', '\\\\d+\\\\.\\\\d{2}']",
                                    },
                                    number_extraction_regex: {
                                      type: "string",
                                      description:
                                        "Regex para extraer solo números del precio",
                                    },
                                  },
                                  additionalProperties: false,
                                },
                                universality_score: {
                                  type: "number",
                                  minimum: 0,
                                  maximum: 1,
                                },
                              },
                              required: ["selector"],
                              additionalProperties: false,
                            },
                            image_url: {
                              type: "object",
                              properties: {
                                selector: {
                                  type: "string",
                                },
                                attribute: {
                                  type: "string",
                                  default: "src",
                                },
                                fallback_selectors: {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                },
                                lazy_loading_attributes: {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                  default: [
                                    "data-src",
                                    "data-lazy-src",
                                    "data-original",
                                  ],
                                },
                                universality_score: {
                                  type: "number",
                                  minimum: 0,
                                  maximum: 1,
                                },
                              },
                              additionalProperties: false,
                            },
                            cta_button: {
                              type: "object",
                              properties: {
                                selector: {
                                  type: "string",
                                },
                                url_attribute: {
                                  type: "string",
                                  default: "href",
                                },
                                text_patterns: {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                  description:
                                    "Patrones regex para identificar botones CTA: ['add.*cart', 'buy.*now', 'comprar', 'agregar']",
                                },
                                universality_score: {
                                  type: "number",
                                  minimum: 0,
                                  maximum: 1,
                                },
                              },
                              additionalProperties: false,
                            },
                          },
                          required: ["name", "price"],
                          additionalProperties: false,
                        },
                        validation_rules: {
                          type: "object",
                          properties: {
                            required_elements: {
                              type: "array",
                              items: {
                                type: "string",
                              },
                              description:
                                "Selectores universales que DEBEN existir para validar el elemento",
                            },
                            excluded_elements: {
                              type: "array",
                              items: {
                                type: "string",
                              },
                              description:
                                "Selectores que indican que NO es un producto (navigation, header, footer)",
                            },
                            content_validation: {
                              type: "object",
                              properties: {
                                must_contain_product_indicators: {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                  description:
                                    "Patrones que indican contenido de producto: ['\\\\$', '€', 'buy', 'add.*cart']",
                                },
                                must_exclude_content: {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                  description:
                                    "Contenido que indica que NO es producto: ['copyright', 'privacy', 'terms']",
                                },
                              },
                              additionalProperties: false,
                            },
                          },
                          additionalProperties: false,
                        },
                      },
                      required: [
                        "structure_id",
                        "item_type_name",
                        "item_type_category",
                        "layout_pattern",
                        "confidence_score",
                        "sample_count",
                        "section_context",
                        "container_selectors",
                        "fields",
                      ],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["page_context", "item_structures"],
                additionalProperties: false,
              },
            },
          },
          stream: false,
          AIGatewayMetadata: {
            userData: { organizationId: "" },
            connectionType: "",
            assistantId: "",
            isInternal: false,
            source: "",
            from: "",
            to: "",
          },
        });
        const choice = completion.choices[0];
        if ("message" in choice) {
          const assistantMessage = choice.message;
          console.log(assistantMessage);
          return c.json({ assistantMessage }, 200);
        }
      } catch (error) {}
    });

    // Ruta para manejar cualquier otro endpoint
    this.app.all("*", (c) => {
      return c.json({ error: "Ruta no encontrada" }, 404);
    });
  }

  // Obtiene los datos de un usuario por medio del ID asignado con nomenclatura: from-organizationId-connectionType.
  async getObjectStateData(
    props: GetDataProps,
  ): Promise<ServiceResponse<UserMessageState, string>> {
    try {
      const { from } = props;
      const namedAgent = await getAgentByName<Env, AssistantMessageWrapper>(
        this.env.ASSISTANT_WRAPPER,
        from as string,
      );

      const state = await namedAgent.getObjectState();

      if (!state.success)
        throw new Error(
          "Ha ocurrido un error obteniendo los datos del usuario.",
        );

      return {
        success: true,
        data: state.data,
      };
    } catch (error) {
      console.error("Error al obtener los datos del usuario:", error);
      return {
        success: false,
        error: "Error al obtener los datos del usuario",
      };
    }
  }

  // Controla la generación y filtra la generación de un mensaje.
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
      // El from viene con la estructura: from-organizationId-connectionType por si el usuario se pone en contacto con diferentes conexiones con el mismo from.
      const filteredFrom = from.split("-")[0];

      const data = { ...props, from: filteredFrom };

      const processedGeneration = await namedAgent.processGeneration(data);

      if (!processedGeneration.success) {
        return {
          success: false,
          error: "Ha ocurrido un error en la generación.",
        };
      }

      console.log("EL 2 => ", processedGeneration.data);

      return { success: true, data: processedGeneration.data };
    } catch (error) {
      console.error("errorzaum => ", error);
      return { success: false, error: "" };
    }
  }
}
