import { UserData } from "@base/shared-types";
export type AppointmentHandlers =
  typeof import("./templates").appointmentHandlers;
export type DefaultHandlers = typeof import("./templates").defaultHandlers;

export type VerificationValidationParams = {
  code: string;
};

// Plantillas de Twilio
export type NewAppointmentNotificationData = {
  name: string;
  date: string;
  time: string;
};

export type AppointmentReminderData = {
  name: string;
  date: string;
  time: string;
};

export type ApppointmentDetailsData = {
  email: string;
  name: string;
  date: string;
  time: string;
  status: string;
  code: string;
};

export type CreatedAppointmentData = {
  email: string;
  name: string;
  date: string;
  time: string;
  code: string;
};

export type CategoryMap = {
  appointments: AppointmentHandlers;
  default: DefaultHandlers;
};

export type VerificationData = {};

export type SubaccountTokens = { accountSid: string; authToken: string };

export type TemplateTypeProps =
  | {
      category: "appointments";
      type:
        | "newAppointmentNotification"
        | "appointmentReminder"
        | "appointmentDetails"
        | "createdAppointment";
      data:
        | NewAppointmentNotificationData
        | AppointmentReminderData
        | ApppointmentDetailsData
        | CreatedAppointmentData;
      from: string;
      to: string;
      connectionType: string;
    }
  | {
      category: "default";
      type: "commonMessage";
      data: string;
      from: string;
      to: string;
      connectionType: string;
    }
  | {
      category: "verifications";
      type: "verification" | "verificationValidation";
      data: VerificationData;
      from: string;
      to: string;
      connectionType: string;
    };

// Datos de la conexión organizacional según su proveedor.
export type TwilioOrganizationalConnectionData = {
  assistantId: string;
  wabaId: string;
  phone: string;
  businessName: string;
  templateId: string;
};

export type OrganizationalTypeConnectionFlow = {
  provider: "twilio";
  data: TwilioOrganizationalConnectionData;
  connectionId: string;
  userData: UserData;
}; // | { etc ... } ;

// Definir el tipo de retorno para cada handler
//type VerificationResult = { success: true; code: string; messageId: string };
//type NewAppointmentResult = { success: true; code: string; messageId: string };

// Tipado específico para cada handler
export type TemplateHandlers = {
  verification: (
    env: Env,
    data: string,
    subaccountTokens: SubaccountTokens,
    from: string,
    to: string,
  ) => Promise<boolean>;
  newAppointmentNotification: (
    env: Env,
    data: NewAppointmentNotificationData,
    subaccountTokens: SubaccountTokens,
    from: string,
    to: string,
  ) => Promise<boolean>;
  appointmentReminder: (
    env: Env,
    data: AppointmentReminderData,
    from: string,
    to: string,
  ) => Promise<boolean>;
  appointmentDetails: (
    env: Env,
    data: ApppointmentDetailsData,
    phone: string,
  ) => Promise<boolean>;
  commonMessage: (
    env: Env,
    data: string,
    subaccountTokens: SubaccountTokens,
    from: string,
    to: string,
  ) => Promise<boolean>;
  createdAppointment: (
    env: Env,
    data: CreatedAppointmentData,
    from: string,
    to: string,
  ) => Promise<boolean>;
};

export type ConnectionTypes = "direct" | "organizational";

export type ConnectionSchema = {
  id: string;
  connectionType: ConnectionTypes;
  connectedWith: string;
  organizationId: string;
  userId: string;
  from?: string;
};
