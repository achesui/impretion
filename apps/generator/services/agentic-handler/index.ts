/**
 * ESTOS SON LOS MANEJADORES DE LA CONEXIÓN DIRECTA
 * Tanto las prompts como las tools.
 */

import { ResponseFormat } from "../../lib/openrouter/openrouter.types";
import {
  databaseQueryPrompt,
  databaseQuerySchemaResponse,
} from "../functions/_agentic/database-query";
import { ragPrompt } from "../functions/_agentic/rag";
import {
  editActionConfigurationPrompt,
  editActionConfigurationSchemaResponse,
} from "../functions/_agentic/edit-action-configuration";
import {
  appointmentAvailabilityCheckSchemaResponse,
  appointmentsAvailabilityCheckPrompt,
} from "../functions/appointment/schemas";

/**
 * Según la petición del "source" retorna: prompt - schema - action response schema - de una conexión directa.
 * **Esto se requiere cuando la llamada a una tool directa requiere ejecutar otra generacion (newGeneration).**
 */
export const agenticHandler: {
  [key: string]: {
    systemPrompt: string;
    actionConfiguration: any;
    actionsSchema: any[];
    actionJsonResponse?: ResponseFormat;
  };
} = {
  /*** DIRECT ***/
  databaseQuery: {
    systemPrompt: databaseQueryPrompt(),
    actionConfiguration: {},
    actionsSchema: [],
    actionJsonResponse: databaseQuerySchemaResponse(),
  },
  editActionConfiguration: {
    systemPrompt: editActionConfigurationPrompt(),
    actionConfiguration: {},
    actionsSchema: [],
    actionJsonResponse: editActionConfigurationSchemaResponse(),
  },
  /******/

  /*** ORGANIZATIONAL ***/
  rag: {
    systemPrompt: ragPrompt(),
    actionConfiguration: {},
    actionsSchema: [],
  },
  // ACCIÓN: appointments
  checkAppointmentsAvailability: {
    systemPrompt: appointmentsAvailabilityCheckPrompt(),
    actionConfiguration: {},
    actionsSchema: [],
    actionJsonResponse: appointmentAvailabilityCheckSchemaResponse(),
  },
  /******/
};
