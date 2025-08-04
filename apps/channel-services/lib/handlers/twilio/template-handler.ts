import { GetConnectionResponse } from "@core-service/types";
import { ServiceResponse } from "../../../../global";
import {
  appointmentHandlers,
  defaultHandlers,
  verificationHandlers,
} from "./templates";
import type { SubaccountTokens, TemplateTypeProps } from "./twilio-types";

const handlerMap: any = {
  appointments: appointmentHandlers,
  default: defaultHandlers,
  verifications: verificationHandlers,
};

export async function templateHandler(
  template: TemplateTypeProps,
  env: Env
): Promise<ServiceResponse<string, string>> {
  try {
    const { category, type, data, from, to, connectionType } = template;

    /**
     * Desde los tokens de la subaccount del usuario de Twilio enviamos los mensajes correspondientes, asi que obtenemos "connectedWith" y buscamos los respectivos tokens.
     * Si la conexión es "directa" se obtienen las credenciales directamente de la main account de twilio.
     */
    let subaccountTokens: SubaccountTokens;
    if (connectionType === "organizational") {
      const connectionResponse = await env.CORE_SERVICE.mainDatabaseHandler({
        type: "connections",
        query: {
          method: "getConnections",
          data: {
            filterByConnectedWith:
              connectionType === "organizational" ? to : from,
          },
        },
        userData: {
          organizationId: "",
        },
      });

      if (!connectionResponse.success) {
        throw new Error("No se ha podido obtener una conexión valida.");
      }

      const [connectionData] =
        connectionResponse.data as GetConnectionResponse[];

      // Obtenemos los tokens de la subaccount obtenidos del 'connectedWith' según el tipo de conexión.
      subaccountTokens = {
        accountSid: connectionData.metadata?.accountSid!,
        authToken: connectionData.metadata?.authToken!,
      };
    } else {
      subaccountTokens = {
        accountSid: env.TWILIO_ACCOUNT_SID,
        authToken: env.TWILIO_AUTH_TOKEN,
      };
    }

    console.log(subaccountTokens);

    const handler = handlerMap[category][type] as (
      env: Env,
      data: any,
      subaccountTokens: SubaccountTokens,
      from: string,
      to: string
    ) => Promise<string>;

    const result = await handler(env, data, subaccountTokens, from, to);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error en templateType:", error);
    return { success: false, error: "Error inesperado" };
  }
}
