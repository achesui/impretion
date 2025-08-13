import { GetConnectionResponse } from "@core-service/types";
import { twilioClient } from "./client";
import { TwilioOrganizationalConnectionData } from "./twilio-types";
import { ServiceResponse, UserData } from "@base/shared-types";

/**
 * Flujo de creación de conexión organizacional con Twilio para el manejo de IA por medio de WhatsApp.
 * Meta deja únicamente agregar un solo 'wabaId' por subaccount en Twilio, por eso es importante validar antes.
 */
export async function twilioOrganizationalConnectionFlow(
  env: Env,
  data: TwilioOrganizationalConnectionData,
  connectionId: string,
  userData: UserData,
): Promise<ServiceResponse<any, string>> {
  const twilio = twilioClient({
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
  });

  let createdSubaccountSid: string | null = null;

  try {
    const { phone, wabaId, businessName, templateId } = data;

    // Validaciones básicas
    if (!phone || !wabaId) {
      throw new Error("Phone y wabaId son requeridos");
    }

    const webhookUrl = buildWebhookUrl(env.ENV, connectionId);
    const subaccountName = `${userData.organizationId}-wabaId:${wabaId}`;

    console.log("Iniciando flujo de conexión organizacional:", {
      wabaId,
      phone,
      connectionId,
      webhookUrl,
    });

    // 1. Verificar si el wabaId ya existe en alguna subaccount
    const existingConnection = await findExistingConnection(
      env,
      wabaId,
      userData,
    );

    // 2. Obtener o crear credenciales de subaccount
    const { accountSid, authToken } = existingConnection
      ? await reuseExistingSubaccount(env, existingConnection)
      : await createNewSubaccount(env, twilio, subaccountName, userData);

    console.log(accountSid, authToken);

    // Guardar el SID si creamos una nueva subaccount para cleanup en caso de error
    if (!existingConnection) {
      createdSubaccountSid = accountSid;
    }

    // 3. Actualizar metadatos de la conexión actual
    await updateConnectionMetadata(env, {
      connectionId,
      accountSid,
      authToken:
        existingConnection?.metadata?.authToken ||
        (await encryptToken(env, authToken)),
      wabaId,
      businessName,
      templateId,
      userData,
    });

    // 4. Crear sender en Twilio
    const senderResponse = await createTwilioSender({
      accountSid,
      authToken,
      phone,
      wabaId,
      webhookUrl,
    });

    console.log("Sender creado exitosamente:", senderResponse);

    return {
      success: true,
      data: senderResponse,
    };
  } catch (error) {
    console.error("Error en el flujo de conexión organizacional:", error);

    // Cleanup: Cerrar subaccount si fue creada en este flujo
    if (createdSubaccountSid) {
      await cleanupSubaccount(
        twilio,
        createdSubaccountSid,
        userData.organizationId,
      );
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Construye la URL del webhook según el ambiente
 */
function buildWebhookUrl(environment: string, connectionId: string): string {
  const baseUrl =
    environment === "development"
      ? "https://3851c041e05b.ngrok-free.app"
      : "https://channel-services.impretion.com";

  return `${baseUrl}/channels/fallback/twilio/whatsapp?connectionType=organizational&id=${connectionId}`;
}

/**
 * Busca una conexión existente con el mismo wabaId
 */
async function findExistingConnection(
  env: Env,
  wabaId: string,
  userData: UserData,
): Promise<GetConnectionResponse | null> {
  const connection = await env.CORE_SERVICE.mainDatabaseHandler({
    type: "connections",
    query: {
      method: "getConnections",
      data: {
        filterByMetadata: {
          operator: "=",
          path: "wabaId",
          value: wabaId,
        },
      },
    },
    userData,
  });

  if (!connection.success) {
    throw new Error("Error al obtener conexiones existentes");
  }

  const [connectionData] = connection.data as GetConnectionResponse[];
  return connectionData || null;
}

/**
 * Reutiliza credenciales de una subaccount existente
 */
async function reuseExistingSubaccount(
  env: Env,
  connectionData: GetConnectionResponse,
): Promise<{ accountSid: string; authToken: string }> {
  console.log("Reutilizando subaccount existente para wabaId");

  if (
    !connectionData.metadata?.authToken ||
    !connectionData.metadata?.accountSid
  ) {
    throw new Error("Credenciales incompletas en la conexión existente");
  }

  // Desencriptar el authToken
  const authTokenDecryptResponse = await env.CRYPTO_SERVICE.symmetricOperation({
    action: "decrypt",
    data: connectionData.metadata.authToken as string,
  });

  if (!authTokenDecryptResponse.success) {
    throw new Error("Error al desencriptar el token de autenticación");
  }

  return {
    accountSid: connectionData.metadata.accountSid as string,
    authToken: authTokenDecryptResponse.data,
  };
}

/**
 * Crea una nueva subaccount en Twilio
 */
async function createNewSubaccount(
  env: Env,
  twilio: any,
  subaccountName: string,
  userData: UserData,
): Promise<{ accountSid: string; authToken: string }> {
  console.log("Creando nueva subaccount:", subaccountName);

  const newSubaccount = await twilio.api.v2010.accounts.create({
    friendlyName: subaccountName,
  });

  if (!newSubaccount?.sid || !newSubaccount?.authToken) {
    throw new Error("Error al crear la subaccount en Twilio");
  }

  return {
    accountSid: newSubaccount.sid,
    authToken: newSubaccount.authToken,
  };
}

/**
 * Encripta un token de autenticación
 */
async function encryptToken(env: Env, token: string): Promise<string> {
  const authTokenEncryptResponse = await env.CRYPTO_SERVICE.symmetricOperation({
    action: "encrypt",
    data: token,
  });

  if (!authTokenEncryptResponse.success) {
    throw new Error("Error al encriptar el token de autenticación");
  }

  return authTokenEncryptResponse.data;
}

/**
 * Actualiza los metadatos de la conexión en la base de datos
 */
async function updateConnectionMetadata(
  env: Env,
  params: {
    connectionId: string;
    accountSid: string;
    authToken: string;
    wabaId: string;
    businessName: string;
    templateId: string;
    userData: UserData;
  },
): Promise<void> {
  const {
    connectionId,
    accountSid,
    authToken,
    wabaId,
    businessName,
    templateId,
    userData,
  } = params;

  const updateResponse = await env.CORE_SERVICE.mainDatabaseHandler({
    type: "connections",
    query: {
      method: "updateConnection",
      data: {
        id: connectionId,
        metadata: {
          accountSid,
          authToken,
          wabaId,
          businessName,
          templateId,
        },
      },
    },
    userData,
  });

  if (!updateResponse.success) {
    throw new Error("Error al actualizar los metadatos de la conexión");
  }
}

/**
 * Crea un sender en Twilio usando la API de Messaging v2
 */
async function createTwilioSender(params: {
  accountSid: string;
  authToken: string;
  phone: string;
  wabaId: string;
  webhookUrl: string;
}): Promise<any> {
  const { accountSid, authToken, phone, wabaId, webhookUrl } = params;

  console.log("wabaId para registrar => ", wabaId);
  const requestBody = {
    sender_id: `whatsapp:${phone}`,
    configuration: {
      waba_id: wabaId,
    },
    profile: {
      name: "test",
    },
    webhook: {
      callback_method: "POST",
      callback_url: webhookUrl,
    },
  };

  console.log("Creando sender en Twilio:", {
    accountSid,
    phone: `whatsapp:${phone}`,
    wabaId,
  });

  const response = await fetch(
    "https://messaging.twilio.com/v2/Channels/Senders",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      },
      body: JSON.stringify(requestBody),
    },
  );

  const responseText = await response.text();
  console.log("Respuesta de Twilio:", {
    status: response.status,
    body: responseText,
  });

  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch (e) {
    responseData = responseText;
  }

  if (!response.ok) {
    throw new Error(
      `Error ${response.status} al crear sender: ${
        responseData?.message || responseData || "Error desconocido"
      }`,
    );
  }

  return responseData;
}

/**
 * Limpia una subaccount creada en caso de error
 */
async function cleanupSubaccount(
  twilio: any,
  subaccountSid: string,
  organizationId: string,
): Promise<void> {
  try {
    console.log(`Limpiando subaccount ${subaccountSid} debido a error`);

    await twilio.api.v2010.accounts(subaccountSid).update({
      status: "closed",
      friendlyName: `${organizationId}-wabaId:error`,
    });

    console.log(`Subaccount ${subaccountSid} cerrada exitosamente`);
  } catch (cleanupError) {
    console.error(
      `Error al limpiar subaccount ${subaccountSid}:`,
      cleanupError,
    );
    // No lanzamos el error para no sobrescribir el error original
  }
}
