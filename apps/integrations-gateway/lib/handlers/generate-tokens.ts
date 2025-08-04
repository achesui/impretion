import { ServiceResponse } from "../../../global";
import {
  GetTokensParams,
  GenerateTokensHandler,
  CalendlyOAuthTokenResponse,
  ServiceTokenData,
  GetServiceType,
  Auth0ManagementApiResponse,
  Auth0CachedManagementApiResponse,
} from "../../types";
import { SelectIntegrationSchema } from "@core-service/types";

const generateTokensHandler: GenerateTokensHandler = {
  /**
   * **METODO PARA FUNCIONAMIENTO INTERNO**
   * Metodo especial para la generación y manejo de tokens de autorizacion para el ManagementAPIv2.
   * Los tokens NO se guardan en la base de datos, unicamente se cachean en KV.
   */
  impretionAuth0ManagementAPI: async (env, data, type) => {
    const cachedTokenData =
      await env.ACCESS_TOKENS.get<Auth0CachedManagementApiResponse>(
        "impretionAuth0ManagementAPI",
        { type: "json" }
      );

    // Check if we have a valid cached token (expires more than 1 hour from now)
    if (cachedTokenData?.accessToken && cachedTokenData?.expiresAt) {
      const expirationTime = new Date(cachedTokenData.expiresAt);
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

      // If token expires more than 1 hour from now, use cached token
      if (expirationTime > oneHourFromNow) {
        const decryptedAccessTokenResponse =
          await env.CRYPTO_SERVICE.symmetricOperation({
            action: "decrypt",
            data: cachedTokenData.accessToken,
          });

        if (!decryptedAccessTokenResponse.success) {
          throw new Error();
        }

        const { data: decryptedAccessToken } = decryptedAccessTokenResponse;

        return decryptedAccessToken;
      }
    }

    // Token doesn't exist, expired, or expires within 1 hour - get new token
    const accessTokenResponse = await fetch(
      "https://dev-xw3cts5yn7mqyar7.us.auth0.com/oauth/token",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: env.AUTH0_MANAGEMENT_API_CLIENT,
          client_secret: env.AUTH0_MANAGEMENT_API_SECRET,
          audience: "https://dev-xw3cts5yn7mqyar7.us.auth0.com/api/v2/",
          grant_type: "client_credentials",
        }),
      }
    );

    if (!accessTokenResponse.ok) {
      throw new Error(
        `Failed to get Auth0 token: ${accessTokenResponse.status} ${accessTokenResponse.statusText}`
      );
    }

    const { access_token, expires_in } =
      await accessTokenResponse.json<Auth0ManagementApiResponse>();

    const encryptedAccessTokenResponse =
      await env.CRYPTO_SERVICE.symmetricOperation({
        action: "encrypt",
        data: access_token,
      });

    if (!encryptedAccessTokenResponse.success) {
      throw new Error();
    }

    const { data: encryptedAccessTokenData } = encryptedAccessTokenResponse;

    await env.ACCESS_TOKENS.put(
      "impretionAuth0ManagementAPI",
      JSON.stringify({
        accessToken: encryptedAccessTokenData,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      })
    );

    const decryptedAccessTokenResponse =
      await env.CRYPTO_SERVICE.symmetricOperation({
        action: "decrypt",
        data: encryptedAccessTokenData,
      });

    if (!decryptedAccessTokenResponse.success) {
      throw new Error();
    }

    const { data: decryptedAccessTokenData } = decryptedAccessTokenResponse;

    console.log("token desencriptado => ", decryptedAccessTokenData);
    return decryptedAccessTokenData;
  },

  calendly: async (
    env,
    data,
    type
  ): Promise<
    SelectIntegrationSchema & { accessToken: string; refreshToken: string }
  > => {
    const calendlyTokenEndpoint = "https://auth.calendly.com/oauth/token";

    try {
      if (type === "generate") {
        console.log("datzaos de calendly -> ", data);
        const { code, code_verifier, redirect_uri } = data;
        // Validate required parameters
        if (!code || !code_verifier || !redirect_uri) {
          throw new Error("Missing required OAuth parameters");
        }
        const getTokensResponse = await fetch(calendlyTokenEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: env.CALENDLY_CLIENT_ID,
            code,
            redirect_uri,
            code_verifier,
            grant_type: "authorization_code",
          }),
        });

        if (!getTokensResponse.ok) {
          const errorText = await getTokensResponse.text();
          throw new Error(`Calendly OAuth error: ${errorText}`);
        }

        const calendlyResponse =
          await getTokensResponse.json<CalendlyOAuthTokenResponse>();
        const {
          access_token,
          created_at,
          expires_in,
          refresh_token,
          owner,
          organization,
        } = calendlyResponse;
        console.log("resouesta de calendly => ", calendlyResponse);

        const [accessTokenResponse, refreshTokenResponse] = await Promise.all([
          env.CRYPTO_SERVICE.symmetricOperation({
            action: "encrypt",
            data: access_token,
          }),
          env.CRYPTO_SERVICE.symmetricOperation({
            action: "encrypt",
            data: refresh_token,
          }),
        ]);

        if (!accessTokenResponse.success || !refreshTokenResponse.success) {
          throw new Error("Failed to encrypt one or both tokens.");
        }

        // Obtención del perfil del usuario conectandose
        const userId = owner.split("/").pop() ?? "";
        const getUserResponse = await fetch(
          `https://api.calendly.com/users/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        );
        const { resource } = await getUserResponse.json<{
          resource: { email: string };
        }>();

        const getUserRole = await fetch(
          `https://api.calendly.com/organization_memberships?user=${owner}`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        );

        const yy = await getUserRole.json();
        console.log("CUCHEI => ", yy);

        const { data: encryptedAccessToken } = accessTokenResponse,
          { data: encryptedRefreshToken } = refreshTokenResponse;

        return {
          id: crypto.randomUUID(),
          accessToken: encryptedAccessToken,
          createdAt: new Date(created_at * 1000),
          expiresAt: new Date((created_at + expires_in) * 1000),
          refreshToken: encryptedRefreshToken,
          service: "calendly",
          updatedAt: new Date(),
          connectedEmail: resource.email || "",
          metadata: {
            owner,
            organization,
          },
        };
      } else if (type === "regenerate") {
        const { refresh_token } = data;
        // Validate required parameters
        if (!refresh_token) {
          throw new Error("Missing required OAuth parameters");
        }

        const decryptedRefreshToken =
          await env.CRYPTO_SERVICE.symmetricOperation({
            action: "decrypt",
            data: refresh_token,
          });

        if (!decryptedRefreshToken.success) throw new Error();

        console.log("FULL TOKEN DESENCRIPT => ", decryptedRefreshToken.data);
        const getTokensResponse = await fetch(calendlyTokenEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: env.CALENDLY_CLIENT_ID,
            grant_type: "refresh_token",
            refresh_token: decryptedRefreshToken.data,
          }),
        });

        // Si la obtención de un access token da error, inspeccionamos el refresh token, para validar si esta activo.
        if (!getTokensResponse.ok) {
          const response = await fetch(
            "https://auth.calendly.com/oauth/introspect",
            {
              method: "POST",
              body: new URLSearchParams({
                client_id: env.CALENDLY_CLIENT_ID,
                token: decryptedRefreshToken.data,
                client_secret: env.CALENDLY_CLIENT_SECRET,
              }),
            }
          );

          const refreshTokenStatus = await response.json<Record<string, any>>();
          console.log(
            "ESTADO ACTUAL DEL REFRESH TOKEN ========> ",
            refreshTokenStatus.active
          );

          if (!refreshTokenStatus.active) {
            // Aquí mandar mensaje de feedback al whatsapp del usuario.
            throw new Error("El refresh token ha expirado.");
          }
        }

        const calendlyResponse =
          await getTokensResponse.json<CalendlyOAuthTokenResponse>();
        const {
          access_token: updated_access_token,
          refresh_token: updated_refresh_token,
          expires_in,
        } = calendlyResponse;
        console.log("TOKEN DE ACCESSO ===> ", updated_access_token);

        const [updatedAccessTokenResponse, updatedRefreshTokenResponse] =
          await Promise.all([
            env.CRYPTO_SERVICE.symmetricOperation({
              action: "encrypt",
              data: updated_access_token,
            }),
            env.CRYPTO_SERVICE.symmetricOperation({
              action: "encrypt",
              data: updated_refresh_token,
            }),
          ]);

        if (
          !updatedAccessTokenResponse.success ||
          !updatedRefreshTokenResponse.success
        ) {
          throw new Error("Failed to encrypt access token.");
        }

        const { data: encryptedAccessToken } = updatedAccessTokenResponse,
          { data: encryptedRefreshToken } = updatedRefreshTokenResponse;

        return {
          id: "",
          accessToken: encryptedAccessToken,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + expires_in * 1000),
          updatedAt: new Date(),
          refreshToken: encryptedRefreshToken,
          service: "calendly",
          connectedEmail: "",
          metadata: { owner: "", organization: "" },
        };
      } else {
        throw new Error("Invalid type parameter");
      }
    } catch (error) {
      console.error("Calendly token generation error:", error);
      throw error;
    }
  },
};

export async function generateTokens<T extends keyof ServiceTokenData>(
  env: Env,
  params: GetTokensParams<T>,
  type: GetServiceType
): Promise<ServiceResponse<SelectIntegrationSchema, any>> {
  const { service, data } = params;

  try {
    console.log(`Processing service type: ${service}`);

    const handler = generateTokensHandler[service];

    if (!handler) {
      throw new Error(`Service type "${service}" not supported`);
    }

    const result = await handler(env, data, type);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(`Error processing service type "${service}":`, error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unexpected error occurred.",
    };
  }
}
