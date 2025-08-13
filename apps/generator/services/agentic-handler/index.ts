/**
 * ESTOS SON LOS MANEJADORES DE LA CONEXIÓN DIRECTA
 * Tanto las prompts como las tools.
 */

import { ragPrompt } from "../../lib/_agentic-functions/rag";
import { ResponseFormat } from "../../lib/openrouter/openrouter.types";
import {
  databaseQueryPrompt,
  databaseQuerySchemaResponse,
} from "../../lib/_agentic-functions/database-query";

import {
  editActionConfigurationPrompt,
  editActionConfigurationSchemaResponse,
} from "../../lib/_agentic-functions/edit-action-configuration";

import {
  appointmentAvailabilityCheckSchemaResponse,
  appointmentsAvailabilityCheckPrompt,
} from "../functions/appointment/schemas";
import {
  summarizeConversationPrompt,
  summarizeConversationPromptSchemaResponse,
} from "../../lib/_agentic-functions/summarize-conversation";

/**
 * Los agentes son ejecuciones en "el background" que realizan los asistentes cuando necesitan ejecutar algo más ya sea en una acción, petición externa, etc...
 * Según la petición del "source" retorna: prompt - schema - action response schema - de una conexión directa, organizational o agentica.
 * Todas las acciones de este handler son agenticas, y pueden estar o no ligadas a una acción o un tipo de conexión.
 * --------------------------------------------------------------------------
 * Las llamas a estas generaciones crean una nueva instancia de newGeneration la cual tomara el systemPrompt, su configuración y el esquema de respuesta por esa pequeña instancia.
 */
export const agenticHandler: {
  [key: string]: {
    systemPrompt: string;
    actionConfiguration: any;
    actionsSchema: any[];
    actionJsonResponse?: ResponseFormat;
  };
} = {
  /**
   * DIRECT
   * Estas acciones se ejecutan en el background para realizar tareas asistente-cliente de Impretion. Permite realizar analiticas o acciones ejecutando el asistente de Impretion.
   */

  // Obtiene información de la base de datos, ejecuta una consulta SQL y devuelve los resultados.
  databaseQuery: {
    systemPrompt: databaseQueryPrompt(),
    actionConfiguration: {},
    actionsSchema: [],
    actionJsonResponse: databaseQuerySchemaResponse(),
  },
  // Edita la configuración de una acción, permite editar la configuración de una acción existente.
  editActionConfiguration: {
    systemPrompt: editActionConfigurationPrompt(),
    actionConfiguration: {},
    actionsSchema: [],
    actionJsonResponse: editActionConfigurationSchemaResponse(),
  },

  /**
   * ORGANIZATIONAL
   * Estas acciones se ejecutan en el background para realizar tareas especificas de acciones como Agendamiento de citas, ordenes, etc...
   */

  // ACCIÓN: appointments - Verifica la disponibilidad de citas.
  checkAppointmentsAvailability: {
    systemPrompt: appointmentsAvailabilityCheckPrompt(),
    actionConfiguration: {},
    actionsSchema: [],
    actionJsonResponse: appointmentAvailabilityCheckSchemaResponse(),
  },

  /**
   * AGENTIC
   * Estas acciones se ejecutan en el background para realizar tareas específicas que no estan ligadas necesariamente a una acción o un tipo de conexión (directa/organizacional).
   */

  /**
   * Genera un resumen de la conversación almacenada en la base de datos para proporcionar contexto a la IA.
   */
  conversationSummarization: {
    systemPrompt: summarizeConversationPrompt(),
    actionConfiguration: {},
    actionsSchema: [],
    actionJsonResponse: summarizeConversationPromptSchemaResponse(),
  },

  /**
   * Recupera información de la base de vectores y la devuelve como respuesta.
   */
  rag: {
    systemPrompt: ragPrompt(),
    actionConfiguration: {},
    actionsSchema: [],
  },

  /**
   * Extrae el HTML dado, utilizado para la obtención de elementos de estos <tags> - Se utiliza para el website chatbot.
   */
  extractHtml: {
    systemPrompt: appointmentsAvailabilityCheckPrompt(),
    actionConfiguration: {},
    actionsSchema: [],
    actionJsonResponse: appointmentAvailabilityCheckSchemaResponse(),
  },
  /******/
};
