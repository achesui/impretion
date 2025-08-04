import { ServiceResponse } from "../../../global";
import { RevokeTokensParams, RevokeTokensHandler } from "../../types";

const revokeTokensHandler: RevokeTokensHandler = {
  calendly: async (
    env: Env,
    accessToken: string,
    refreshToken: string
  ): Promise<void> => {
    try {
      // Decrypt the tokens first
      const [accessTokenResponse, refreshTokenResponse] = await Promise.all([
        env.CRYPTO_SERVICE.symmetricOperation({
          action: "decrypt",
          data: accessToken,
        }),
        env.CRYPTO_SERVICE.symmetricOperation({
          action: "decrypt",
          data: refreshToken,
        }),
      ]);

      if (!accessTokenResponse.success || !refreshTokenResponse.success) {
        throw new Error("Failed to decrypt one or both tokens.");
      }

      const { data: decryptedAccessToken } = accessTokenResponse;
      const { data: decryptedRefreshToken } = refreshTokenResponse;

      // Elimina ambos tokens en paralelo, solo da error si el refresh no se remueve.
      const [_, refreshTokenRevokeResponse] = await Promise.all([
        fetch("https://auth.calendly.com/oauth/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: decryptedAccessToken,
            client_id: env.CALENDLY_CLIENT_ID,
            client_secret: env.CALENDLY_CLIENT_SECRET,
          }),
        }),
        fetch("https://auth.calendly.com/oauth/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: decryptedRefreshToken,
            client_id: env.CALENDLY_CLIENT_ID,
            client_secret: env.CALENDLY_CLIENT_SECRET,
          }),
        }),
      ]);

      if (!refreshTokenRevokeResponse.ok) {
        throw new Error(
          `Calendly token revocation failed. Refresh token could not be removed.`
        );
      }

      console.log("Calendly tokens revoked successfully");
    } catch (error) {
      console.error("Calendly token revocation error:", error);
      throw error;
    }
  },
};

export async function revokeTokens(
  env: Env,
  params: RevokeTokensParams
): Promise<ServiceResponse<{}, any>> {
  const { service, accessToken, refreshToken } = params;

  try {
    console.log(`Processing token revocation for service: ${service}`);

    const handler = revokeTokensHandler[service];

    if (!handler) {
      throw new Error(
        `Service type "${service}" not supported for token revocation`
      );
    }

    await handler(env, accessToken, refreshToken);

    console.log(`Token revocation successful for service: ${service}`);
    return {
      success: true,
      data: {},
    };
  } catch (error) {
    console.error(`Error revoking tokens for service "${service}":`, error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unexpected error occurred during token revocation.",
    };
  }
}
