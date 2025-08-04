import { GetConnectionResponse } from "@core-service/types";
import { ServiceResponse, UserData } from "../../../../global";
import { twilioClient } from "./client";
import { TwilioOrganizationalConnectionData } from "./twilio-types";

/**
 * Flujo de creación de conexión organizacional con Twilio para el manejo de IA por medio de Whatsapp.
 * Meta deja únicamente agregar un solo 'wabaId' por subaccount en Twilio, por eso es importante validar antes.
 */
export async function twilioOrganizationalConnectionFlow(
  env: Env,
  data: TwilioOrganizationalConnectionData,
  connectionId: string,
  userData: UserData
): Promise<ServiceResponse<any, string>> {
  try {
    console.log("Datos obtenidos para la conexión organizacional: ", data);
    console.log("Datos del usuario: ", userData);
    console.log("Id de conexion: ", connectionId);

    const { phone, wabaId } = data;

    // Validaciones básicas
    if (!phone || !wabaId) {
      throw new Error("Phone y wabaId son requeridos");
    }

    const twilio = twilioClient(env);
    const subaccountName = `${userData.organizationId}-wabaId:${wabaId}`;

    /**
     * 1. Validamos si el 'wabaId' ya pertenece a alguna subaccount
     */
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
      throw new Error(
        "Ha ocurrido un error en la obtención de la conexión organizacional."
      );
    }

    const [connectionData] = connection.data as GetConnectionResponse[];

    let subaccountAccountSid: string;
    let subaccountAuthToken: string;

    // Si existe una subaccount con este waba asignamos sus accountSid y authTokens
    if (connectionData) {
      console.log(
        "El wabaId ya pertenece a una subaccount. Obteniendo tokens."
      );

      // Desencriptamos el 'authToken'
      const authTokenDecryptResponse =
        await env.CRYPTO_SERVICE.symmetricOperation({
          action: "decrypt",
          data: connectionData.metadata!.authToken,
        });

      if (!authTokenDecryptResponse.success) {
        throw new Error(
          "Ha ocurrido un error en la desencriptación del token."
        );
      }

      // Asignamos el authToken desencriptado.
      subaccountAccountSid = connectionData.metadata!.accountSid;
      subaccountAuthToken = authTokenDecryptResponse.data;
    } else {
      console.log(
        "Creando una subaccount de twilio para el wabaId: ",
        subaccountName
      );

      // Creamos nueva subaccount
      const newSubaccount = await twilio.api.v2010.accounts.create({
        friendlyName: subaccountName,
      });

      if (!newSubaccount) {
        throw new Error("Error en la creación de la subaccount en Twilio.");
      }

      const { sid, authToken } = newSubaccount;

      const authTokenEncryptResponse =
        await env.CRYPTO_SERVICE.symmetricOperation({
          action: "encrypt",
          data: authToken,
        });

      if (!authTokenEncryptResponse.success) {
        throw new Error("Error en la encriptación del authToken.");
      }

      const newOrganizationalConnection =
        await env.CORE_SERVICE.mainDatabaseHandler({
          type: "connections",
          query: {
            method: "updateConnection",
            data: {
              id: connectionId,
              metadata: {
                accountSid: sid,
                authToken: authTokenEncryptResponse.data,
                wabaId,
              },
            },
          },
          userData,
        });

      if (!newOrganizationalConnection.success) {
        throw new Error("Error en la creación de la conexión organizacional.");
      }

      subaccountAccountSid = sid;
      subaccountAuthToken = authToken;
    }

    console.log("Tokens obtenidos:", {
      accountSid: subaccountAccountSid,
      phone: `whatsapp:${phone}`,
      wabaId,
    });

    // CORRECCIÓN PRINCIPAL: Usar la API correcta y formato adecuado
    const requestBody = {
      sender_id: `whatsapp:${phone}`,
      configuration: {
        waba_id: wabaId,
      },
      webhook: {
        callback_method: "POST",
        callback_url: `https://db00616c898d.ngrok-free.app/channels/twilio/whatsapp?connectionType=organizational`,
        fallback_url:
          "https://db00616c898d.ngrok-free.app/channels/fallback/twilio/whatsapp?connectionType=organizational",
      },
    };

    console.log(
      "Request body para Twilio:",
      JSON.stringify(requestBody, null, 2)
    );

    const newSenderResponse = await fetch(
      "https://messaging.twilio.com/v2/Channels/Senders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(
            `${subaccountAccountSid}:${subaccountAuthToken}`
          )}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log("Response status:", newSenderResponse.status);
    console.log("Response headers:", newSenderResponse.headers);

    // Leer el body de la respuesta para obtener más detalles del error
    const responseText = await newSenderResponse.text();
    console.log("Response body:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }

    if (!newSenderResponse.ok) {
      console.error("Error en la respuesta de Twilio:", {
        status: newSenderResponse.status,
        statusText: newSenderResponse.statusText,
        body: responseData,
      });

      // Devolver información más específica del error
      return {
        success: false,
        error: `Error ${newSenderResponse.status}: ${
          responseData?.message || responseData || "Error desconocido"
        }`,
      };
    }

    console.log("Sender creado exitosamente:", responseData);

    return {
      success: true,
      data: responseData,
    };
  } catch (error) {
    console.error("Error en el flujo de conexión organizacional: ", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
