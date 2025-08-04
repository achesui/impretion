import { ActionSchema, ActionType } from "types";
import { appointment } from "./schema/appointment";
//import { webExtractor as web_extractor } from "./schema/web_extractor";

// El esquema de acciones es un objeto que contiene los esquemas de las acciones disponibles.
// Cada esquema de acción es un objeto que contiene los detalles, configuración y parámetros de las acciones.

/*
  DETALLES (details)
  Se encuentra TODA la configuración estática posibles de la acción.
  Se encuentran TODOS los parametros estaticos posibles de la acción.
*/

/*
  CONFIGURACIÓN (configuration) - OPCIONES DINÁMICAS
  Se encuentra toda la configuración necesaria para ejecutar la acción.
  Es decir, todas las opciones que el usuario puede seleccionar para ejecutar la acción.
  Se actualiza según la configuración seleccionada por el usuario final.
*/

/*
  PARÁMETROS (parameters) - PARAMETROS DINÁMICOS
  En parámetros se encuentran todos los datos que el usuario final debe proporcionar para ejecutar la acción.
  Es decir, todos los datos que el usuario final debe ingresar para ejecutar la acción.
  Se actualizan según la configuración seleccionada por el usuario final.
*/

/*
  PARÁMETROS EXTRA (parameters) - PARAMETROS NO VISIBLES
  Se encuentran todos los datos que el usuario final no necesita ingresar para ejecutar la acción.
  Son parametros ejecutados internamente por el asistente, para el correcto funcionamiento de la llamada a la accion.
  Esto permite que el comportamiento del la llamada a la accion puede ser modificado dinamicamente tambien.
*/

const actionSchemas: Record<ActionType, ActionSchema> = {
  appointment,
};

export default actionSchemas;
