import { Hono } from "hono";
import { WorkerEntrypoint } from "cloudflare:workers";
import { generateTokens } from "../lib/handlers/generate-tokens";
import {
  GetServiceType,
  GetTokensParams,
  RevokeTokensParams,
  ServiceTokenData,
} from "../types";
import { revokeTokens } from "../lib/handlers/revoke-tokens";
import { SelectIntegrationSchema } from "@core-service/types";
import { ServiceResponse } from "@base/shared-types";
import { hmacValidation } from "../lib/validations/hmac";

export default class IntegrationsGateway extends WorkerEntrypoint<Env> {
  private app = new Hono<{ Bindings: Env }>();

  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env);
    this.setupRoutes();
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request, this.env, this.ctx);
  }

  async getTokens<T extends keyof ServiceTokenData>(
    params: GetTokensParams<T>,
    type: GetServiceType,
  ): Promise<ServiceResponse<SelectIntegrationSchema, any>> {
    console.log("params => ", params);
    console.log("type => ", type);
    return await generateTokens(this.env, params, type);
  }

  async removeTokens(
    service: keyof ServiceTokenData,
    accessToken: string,
    refreshToken: string,
  ): Promise<ServiceResponse<{}, any>> {
    const params: RevokeTokensParams = {
      service,
      accessToken,
      refreshToken,
    };

    return await revokeTokens(this.env, params);
  }
}

/*

app.use('*', bearerAuth({
  verifyToken: async (token: string, c: Context<{ Bindings: Env }>) => {
    const secret = await c.env.INTEGRATIONS_GATEWAY_BEARER_AUTH_TOKEN.get()
    return token === secret
  }
}))

app.post("/prueba", async (c) => { // No necesitas 'async' aquí si los handlers lo son
  const encryted = await c.env.CRYPTO_SERVICE.encrypt("hola")
  console.log(encryted)
  return c.json({})
});

app.post("/access/:service", async (c) => { // No necesitas 'async' aquí si los handlers lo son
  const service = c.req.param('service');
  const {
    code,
    redirectUri,
    grantType,
    userId,
    organizationId,
  } = await c.req.json();
  const neonUrl = await c.env.NEON_URL_POOL_CONNECTION.get()
  const neonClient = neon(neonUrl)

  switch (service) {
    case 'calendly':
      return calendlyAccessHandler({ neonClient, code, redirectUri, grantType, userId, organizationId, service, c });
    default:
      return c.json({ error: 'Servicio no soportado' }, 404);
  }
});

app.post("/remove-access/:service", async (c) => { // No necesitas 'async' aquí si los handlers lo son
  const service = c.req.param('service');
  const { integrationId } = await c.req.json();
  const neonUrl = await c.env.NEON_URL_POOL_CONNECTION.get()
  const neonClient = neon(neonUrl)

  switch (service) {
    case 'calendly':
      return calendlyRemoveAccessHandler({ neonClient, integrationId, c });
    default:
      return c.json({ error: 'Servicio no soportado' }, 404);
  }
});
 */

/*
app.post("/remove-access/:service", (c) => { // No necesitas 'async' aquí si los handlers lo son
  const service = c.req.param('service');
  switch (service) {
    case 'calendly':
      return calendlyHandler(c);
    default:
      return c.json({ error: 'Servicio no soportado' }, 404);
  }
});

app.post("/access/calendly", async (c) => {
  try {
    const { code, grantType, redirectUri, integrationId } = await c.req.json();
    const clientId = c.env.CALENDLY_CLIENT_ID;
    const clientSecret = c.env.CALENDLY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Error: CALENDLY_CLIENT_ID o CALENDLY_CLIENT_SECRET no están configuradas.");
      return c.json({ error: "Configuración del servidor incompleta." }, 500);
    }
    const basicAuthToken = btoa(`${clientId}:${clientSecret}`);

    const response = await fetch('https://auth.calendly.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuthToken}`
      },
      body: new URLSearchParams({ grant_type: grantType, code, redirect_uri: redirectUri })
    });

    const data = await response.json<CalendlyOAuthTokenResponse>();

    console.log("datos: ", data.access_token)
    console.log("organizacao: ", data.organization)

    if (!response.ok) {
      console.error("Error desde la API de Calendly:", data);
      return c.json({ error: "Error de la API de Calendly", details: data }, 400);
    }

    const { refresh_token: refreshToken, expires_in: expiresIn, created_at: createdAt } = data;

    const expiresAt = (createdAt + expiresIn) * 1000;

    const cryptoServiceResponse = await c.env.CRYPTO_SERVICE.fetch(`${CRYPTO_SERVICE}/encrypt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        textToEncrypt: refreshToken
      })
    });

    if (!cryptoServiceResponse.ok) {
      console.error("Error desde el servicio de encriptación:", cryptoServiceResponse.statusText);
      return c.json({ error: "Error de encriptación" }, 500);
    }

    const encryptedRefreshToken = await cryptoServiceResponse.json<SuccessResponse<{ encrypted: string }>>();

    if (!encryptedRefreshToken.success) {
      return c.json({ error: "Ha ocurrido un error en la encriptación del token" }, 400);
    }

    const { encrypted } = encryptedRefreshToken.data;

    await c.env.ACCESS_TOKENS.put(integrationId, JSON.stringify({
      accessToken: data.access_token,
      refreshToken: encrypted,
      expiresAt: expiresAt
    }));

    return c.json({ data: integrationId }, 200);
  } catch (error) {
    console.error("Error inesperado en el manejador 'calendly':", error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

app.post("/remove-access/calendly", async (c) => {
  try {
    const { integrationId } = await c.req.json();
    const clientId = c.env.CALENDLY_CLIENT_ID;
    const clientSecret = c.env.CALENDLY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Error: CALENDLY_CLIENT_ID o CALENDLY_CLIENT_SECRET no están configuradas.");
      return c.json({ error: "Configuración del servidor incompleta." }, 500);
    }

    const accessData = await c.env.ACCESS_TOKENS.get<NewAccessTokenSession>(integrationId, { type: "json" });

    if (!accessData) {
      return c.json({ error: "No se encontraron datos de acceso para la nomenclatura especificada" }, 404);
    }

    //console.log("removiendo el token: ", accessData.accessToken)
    const response = await fetch('https://auth.calendly.com/oauth/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, token: accessData.accessToken })
    });

    if (!response.ok) {
      return c.json({ error: "Error al revocar el token" }, 400);
    }

    await c.env.ACCESS_TOKENS.delete(integrationId);
    return c.json({ success: true, message: "Token revocado exitosamente" }, 200);
  } catch (error) {
    console.error("Error inesperado en el manejador 'calendly':", error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
})
 */
