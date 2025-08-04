import { SelectConnectionSubscriptionsSchema } from "@core-service/types";
import { Schedule } from "agents";

export type UserData = { organizationId: string; userId?: string };

/* CHAT COMPLETION */
export type ChatCompletionsHelpers<TAgentContext> = {
  schedule: <T = string>(
    when: Date | string | number,
    callback: keyof TAgentContext,
    payload?: T
  ) => Promise<Schedule<T>>;
  cancelSchedule: (id: string) => Promise<boolean>;
  state: UserMessageState;
  setState: (state: UserMessageState) => void;
};

export type ChatCompletionProps<TAgentContext> = {
  stateHelpers: ChatCompletionsHelpers<TAgentContext>;
  env: Env;
  body: GenerationProps;
  models?: string[];
};

export type ConnectionTypes = "direct" | "organizational" | "agentic";

/* ACTION RESPONSE */
/**
 * Union de las posibles respuestas de una acción:
 * si "withTemplate" es "true" la respuesta esta pre-definida y lista para ser enviada a algun canal (whatsapp, sitio web, etc...)
 * si "withTemplate" es "false" la respuesta es un string simple que debe ser procesado por la IA para ser enviado finalmente a algun canal (whatsapp, email, etc..)
 */
export type ActionResponse =
  | {
      withTemplate: true;
      data: {
        category: "default" | "appointments";
        response: string | Record<string, any>;
        type: string;
      };
      responseMetadata: Record<string, any>;
    }
  | {
      withTemplate: false;
      data: { response: string };
    };

/* ACTIONS */
export type GenerationProps = {
  connectionType: ConnectionTypes;
  userData: UserData;
  source: string;
  subscriptions: SelectConnectionSubscriptionsSchema[];
  message: string;
  to: string;
  from: string;
  isInternal: boolean;
};

export type ProcessGenerationProps = {
  subscribedToAssistant: string;
  message: string;
  connectionType: ConnectionTypes;
  userData: UserData;
  source: string;
  isInternal: boolean;
};

export type GenerationResponse = { content: string; model: string };

export type AIGatewayMetadata = {
  userData: UserData;
  connectionType: string;
  assistantId: string;
  isInternal: boolean;
  source: string;
  from: string;
  to: string;
};

export type FunctionCallingProps<TAgentContext, TFunctionArgs> = {
  stateHelpers: ChatCompletionsHelpers<TAgentContext>;
  functionType: string;
  functionArguments: TFunctionArgs;
  assistantId: string;
  actionConfiguration: ActionsConfiguration;
  userData: UserData;
  from: string;
  to: string;
  env: Env;
};

export type ActionSchema = {
  name: string;
  strict: boolean;
  parameters: Record<string, any>;
  description: string;
};

export type AssistantActionsData = {
  actionId: string;
  actionType: string;
  actionSchema: ActionSchema;
  configuration: Record<string, any>;
}[];

export type ActionsConfiguration = {
  [key: string]: {
    actionId: string;
    configurationData: AppointsmentsConfiguration | OrdersConfiguration | {};
  };
};

export type ActionIntegration = {
  integrationId: string;
  email: string;
  userId: string;
  service: string;
  tokenData: {
    createdAt: Date;
    expiresAt: Date;
    updatedAt: Date;
  };
};

/**
 * El sistema actualmente esta diseñado para trabajar unicamente con Whatsapp
 * Para otro tipos de conexiones hay que implementarlo por medio de las props.
 * Actualmente únicamente trabajaremos con Whatsapp.
 */
export type ActionsResponse = { actionType: string; whatsapp: boolean };

/* PARAMETROS DE ACCIONES */
export type AppointmentsArgs = {
  actionType: "create" | "update" | "availability" | "cancel" | "details";
  date: string;
  code: string;
  time: string;
  phone: string;
  name: string;
  email: string;
  location?: string | undefined;
};

/**
 * Parametros 'appointments' transformados donde cambiamos 'time' de string a un objeto con 'startTime' y 'endTime'
 * Se hacen los cambios necesarios antes de procesar todos los datos y se continua con la ejecución del flujo.
 */
export type TransformedAppointmentArgs = Omit<AppointmentsArgs, "time"> & {
  time: {
    startTime: string;
    endTime: string;
  };
};

export type DatabaseQueryArgs = {
  naturalLanguageQuery: string;
};

export type EditActionConfigurationArgs = {
  naturalLanguageQuery: string;
};

export type DynamicSchedulerArgs = {
  cron: string;
  task: string;
};

export type RagArgs = {
  collectionIds: string[];
  optimizedQuery: string;
};

/* APPOINTSMENTS */

export type AppointsmentsConfiguration = {
  schedule: {
    id: number;
    value: {
      friday: {
        isEnabled: boolean;
        startTime: string;
        endTime: string;
      };
      monday: {
        isEnabled: boolean;
        startTime: string;
        endTime: string;
      };
      sunday: {
        isEnabled: boolean;
        startTime: string;
        endTime: string;
      };
      tuesday: {
        isEnabled: boolean;
        startTime: string;
        endTime: string;
      };
      saturday: {
        isEnabled: boolean;
        startTime: string;
        endTime: string;
      };
      thursday: {
        isEnabled: boolean;
        startTime: string;
        endTime: string;
      };
      wednesday: {
        isEnabled: boolean;
        startTime: string;
        endTime: string;
      };
    };
  };
  timeZone: { id: number; value: string };
  startDate: { id: number; value: string };
  integrations: { id: number; value: ActionIntegration[] };
  slotInterval: { id: number; value: number };
  maxAppointmentsPerDay: {
    id: number;
    value: { value: number; isAuto: boolean };
  };
};

/* ORDERS */
type OrdersResponseCatalog = {
  orderDetails: {
    name: string;
    extras: [{ name: string; quantity: number }];
    modificables: {
      substitute: string;
      replacedBy: string;
      quantity: number;
    };
    customPreferences: string;
  }[];
  isProcessable: boolean;
  productPrices: { name: string; price: number; quantity: number }[];
  rejectedProducts: {
    name: string;
    recommendations: {
      name: string;
      price: number;
    }[];
  }[];
};

type Orders = {
  actionType: "create" | "update" | "cancel" | "read" | "catalog";
  name: string;
  order: string;
  phone: string;
  address: string;
  code: string;
};

type OrdersConfiguration = {
  schedule: {
    id: number;
    value: {
      friday: {
        endTime: string;
        isEnabled: boolean;
        startTime: string;
      };
      monday: {
        endTime: string;
        isEnabled: boolean;
        startTime: string;
      };
      sunday: {
        endTime: string;
        isEnabled: boolean;
        startTime: string;
      };
      tuesday: {
        endTime: string;
        isEnabled: boolean;
        startTime: string;
      };
      saturday: {
        endTime: string;
        isEnabled: boolean;
        startTime: string;
      };
      thursday: {
        endTime: string;
        isEnabled: boolean;
        startTime: string;
      };
      wednesday: {
        endTime: string;
        isEnabled: boolean;
        startTime: string;
      };
    };
  };
  inventory: {
    id: number;
    value: {
      products: string;
    };
  };
  QRPayments: {
    id: number;
    value: {
      isEnabled: boolean;
      merchantId: string;
      documentType: string;
      documentNumber: string;
      accountHolderName: string;
    };
  };
  deliveriesLocations: {
    id: number;
    value: {
      price: number;
      location: string;
    }[];
  };
};

type ActionData = {
  orders: { configuration: OrdersConfiguration; actionId: string };
};

/** ACTION STATES **/
// Se encarga del almacenamiento de cada acción según las peticiones del usuario.
type OrderState = {
  currentOrder: number;
};

export type appointmentState = {
  appointmentCode: string;
  scheduleCode: string;
  // Estos dos parametros se utilizan para monitorear este estado y eliminarlo una vez la cita se realice.
  appointmentDate: string;
  appointmentTime: string;
};

export type UserMessageState = {
  // Contexto conversacional resumido y optimizado para soportar largas conversaciones.
  conversationContext: {
    role: string;
    content: string;
  }[];
  // Conversación entera guardada para consulta.
  fullConversationContext: {}[];
  actionState?: {
    appointments: appointmentState[];
  };
};

/* SCHEDULE SYSTEM */

// ==== RESPUESTAS ====

type AppointmentReminderResponse = {
  success: boolean;
  message: string;
};

type DynamicSchedulerResponse = {
  success: boolean;
  message: string;
};

// ==== PARAMETROS ====

type AppointmentReminderParams = {
  name: string;
  phone: string;
  date: string;
  time: string;
};

type DynamicSchedulerParams = GenerationProps;

// ==== HANDLERS ====

export type ScheduleHandlers = {
  appointmentReminder: (
    env: Env,
    data: AppointmentReminderParams,
    source: string
  ) => Promise<AppointmentReminderResponse>;
};

export type ScheduleQueryProps = {
  method: "appointmentReminder";
  data: AppointmentReminderParams;
  source: string;
};

// ==== TIPO PARA LA FUNCIÓN SCHEDULE ====
// Este es el tipo que debe usar tu función schedule en el tercer parámetro
export type ScheduleProps = ScheduleQueryProps;
