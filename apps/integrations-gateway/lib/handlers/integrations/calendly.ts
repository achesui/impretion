import { Context } from "hono";
import {
  CalendlyError,
  CryptoError,
  DbError,
  GeneralError,
  IntegrationError,
  KvError,
} from "../../errors";
import { NeonQueryFunction } from "@neondatabase/serverless";
import { ErrorDetails, ServiceResponse } from "../..";

export async function calendlyAccessHandler({
  neonClient,
  code,
  redirectUri,
  grantType,
  userId,
  organizationId,
  service,
  c,
}: AccessRequestBody<
  NeonQueryFunction<false, false>,
  Context<{ Bindings: Env }>
>): Promise<Response> {
  const integrationId = `${userId}-access:calendly`;

  try {
    const clientId = c.env.CALENDLY_CLIENT_ID;
    const clientSecret = c.env.CALENDLY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new GeneralError({
        name: "SECRETS_NOT_FOUND",
        message: "La configuración del servidor para Calendly está incompleta.",
      });
    }

    const basicAuthToken = btoa(`${clientId}:${clientSecret}`);
    const response = await fetch("https://auth.calendly.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuthToken}`,
      },
      body: new URLSearchParams({
        grant_type: grantType,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new CalendlyError({
        name: "UNABLE_TO_RETRIEVE_TOKEN",
        message: "Error al obtener el token de acceso desde Calendly.",
      });
    }

    const calendlyAuthResponse =
      await response.json<CalendlyOAuthTokenResponse>();
    const {
      refresh_token: refreshToken,
      expires_in: expiresIn,
      created_at: createdAt,
      access_token: accessToken,
    } = calendlyAuthResponse;

    const expiresAtTimestamp = new Date((createdAt + expiresIn) * 1000);
    const createdAtTimestamp = new Date(createdAt * 1000);

    const [encryptedRefreshToken, encryptedAccessToken] = await Promise.all([
      c.env.CRYPTO_SERVICE.encrypt(refreshToken),
      c.env.CRYPTO_SERVICE.encrypt(accessToken),
    ]);

    if (!encryptedRefreshToken.success || !encryptedAccessToken.success) {
      throw new CryptoError({
        name: "UNABLE_TO_ENCRYPT_ACCESS_OR_REFRESH_TOKEN",
        message: "Fallo al cifrar los tokens de acceso.",
      });
    }

    const [newIntegration] = (await neonClient.query(
      `INSERT INTO integrations (id, service, refresh_token, access_token, expires_at,created_at,user_id)
            SELECT $1, $2, $3, $4, $5, $6, u.id
            FROM users u
            WHERE u.id = $7 AND u.organization_id = $8
            RETURNING id;`,
      [
        integrationId,
        service,
        encryptedRefreshToken.data,
        encryptedAccessToken.data,
        expiresAtTimestamp,
        createdAtTimestamp,
        userId,
        organizationId,
      ]
    )) as NewAccessTokenSession[];

    if (!newIntegration || !newIntegration.id) {
      throw new IntegrationError({
        name: "UNABLE_TO_INSERT_INTEGRATION",
        message: "Fallo al crear la integración en la base de datos.",
      });
    }

    return c.json<ServiceResponse<boolean, null>>(
      {
        success: true,
        data: true,
      },
      200
    );
  } catch (error) {
    console.error("Error en el manejador 'calendlyAccessHandler':", error);

    if (
      error instanceof GeneralError ||
      error instanceof CalendlyError ||
      error instanceof CryptoError ||
      error instanceof IntegrationError
    ) {
      return c.json<ServiceResponse<null, ErrorDetails>>(
        {
          success: false,
          error: {
            name: error.name,
            message: error.message,
          },
        },
        400
      );
    }

    return c.json<ServiceResponse<null, ErrorDetails>>(
      {
        success: false,
        error: {
          name: "INTERNAL_ERROR",
          message: "Ocurrió un error interno inesperado en el servidor.",
        },
      },
      500
    );
  }
}

export async function calendlyRemoveAccessHandler({
  neonClient,
  integrationId,
  c,
}: RemoveAccessRequestBody<
  NeonQueryFunction<false, false>,
  Context<{ Bindings: Env }>
>) {
  try {
    const clientId = c.env.CALENDLY_CLIENT_ID;
    const clientSecret = c.env.CALENDLY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new GeneralError({
        name: "SECRETS_NOT_FOUND",
        message: "No se encontraron las variables de entorno.",
      });
    }

    const [integrationRefreshToken] = (await neonClient.query(
      `SELECT refresh_token FROM integrations
            WHERE id = $1;`,
      [integrationId]
    )) as { refresh_token: string }[];

    if (!integrationRefreshToken || !integrationRefreshToken.refresh_token) {
      throw new IntegrationError({
        name: "UNABLE_TO_RETRIEVE_INTEGRATION",
        message: "No se encontró la integración.",
      });
    }

    const revokeResponse = await fetch(
      "https://auth.calendly.com/oauth/revoke",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          token: integrationRefreshToken.refresh_token,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      }
    );

    if (!revokeResponse.ok) {
      throw new CalendlyError({
        name: "UNABLE_TO_REVOKE_TOKEN",
        message: "La API de Calendly no pudo revocar el token.",
      });
    }

    let retrievedIntegration: { id: string } | undefined;
    try {
      [retrievedIntegration] = (await neonClient.query(
        `DELETE FROM integrations
                WHERE id = $1
                RETURNING id;`,
        [integrationId]
      )) as { id: string }[];
    } catch (error) {
      // Logs de errores... [DBLOG]
      // No se concreto la eliminacion en la base de datos pero si en calendly, dara errores.
      throw new IntegrationError({
        name: "UNABLE_TO_DELETE_INTEGRATION",
        message: "El token no pudo ser eliminado de la base de datos.",
      });
    }

    if (retrievedIntegration && !retrievedIntegration.id) {
      throw new IntegrationError({
        name: "UNABLE_TO_DELETE_INTEGRATION",
        message: "No se pudo eliminar la integración.",
      });
    }

    return c.json<ServiceResponse<string, ErrorDetails>>(
      {
        success: true,
        data: "Integración y token revocados exitosamente.",
      },
      200
    );
  } catch (error) {
    console.error("Error durante la revocación de acceso a Calendly:", error);

    if (
      error instanceof CalendlyError ||
      error instanceof GeneralError ||
      error instanceof KvError ||
      error instanceof DbError
    ) {
      return c.json<ServiceResponse<any, ErrorDetails>>(
        {
          success: false,
          error: {
            name: error.name,
            message: error.message,
          },
        },
        400
      );
    }

    return c.json<ServiceResponse<null, ErrorDetails>>(
      {
        success: false,
        error: {
          name: "INTERNAL_ERROR",
          message: "Ocurrió un error inesperado al intentar revocar el acceso.",
        },
      },
      500
    );
  }
}
