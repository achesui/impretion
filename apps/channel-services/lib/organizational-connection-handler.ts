import { twilioOrganizationalConnectionFlow } from "./handlers/twilio/organizational-connection-flow";
import { OrganizationalTypeConnectionFlow } from "./handlers/twilio/twilio-types";
import { UserData, ServiceResponse } from "@base/shared-types";

const handlerMap: any = {
  twilio: twilioOrganizationalConnectionFlow,
};

export async function organizationalConnectionHandler(
  connectionFlow: OrganizationalTypeConnectionFlow,
  env: Env
): Promise<ServiceResponse<string, string>> {
  try {
    const { provider, data, connectionId, userData } = connectionFlow;

    const handler = handlerMap[provider] as (
      env: Env,
      data: Record<string, any>,
      connectionId: string,
      userData: UserData
    ) => Promise<string>;

    console.log("datos en el handler- > ", data, userData);

    const result = await handler(env, data, connectionId, userData);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error en templateType:", error);
    return { success: false, error: "Error inesperado" };
  }
}
