import { WorkerEntrypoint } from "cloudflare:workers";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  MercadoPagoPaymentDetails,
  MercadoPagoPreference,
  MercadoPagoWebhookPayload,
  OpenExchangeAPIResponse,
  OpenExchangeResponse,
} from "./types";
import { ServiceResponse } from "@base/shared-types";

const app = new Hono<{ Bindings: Env }>();
app.use(
  "/api/*",
  cors({
    origin: [
      "https://8518-2800-e2-1300-3ea-8c15-259b-7425-157f.ngrok-free.app",
      "http://localhost:3000",
    ],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    maxAge: 600,
  })
);

export default class ApisGateway extends WorkerEntrypoint<Env> {
  private app = new Hono<{ Bindings: Env }>();

  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env);
    //this.setupAuth();
    this.setupRoutes();
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request, this.env, this.ctx);
  }

  private setupRoutes() {
    /**
     * MERCADOPAGO
     */
    // Webhook de mercadopago.
    this.app.post("/mercadopago/webhook/payment", async (c) => {
      const payment = await c.req.json<MercadoPagoWebhookPayload>();
      const { type, data } = payment;

      if (type !== "payment" || !data.id) {
        console.warn(
          '[Webhook] Notificación recibida no es de tipo "payment" o no tiene data.id.',
          payment
        );
        return c.json<ServiceResponse<MercadoPagoPreference, any>>(
          {
            success: false,
            error: "Notificación invalida.",
          },
          400
        );
      }

      const paymentId = payment.data.id;
      console.log(
        `[Webhook] Notificación recibida para el pago: ${paymentId}. Acción: ${payment.action}`
      );

      const getPaymentDetailsResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${c.env.MERCADOPAGO_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!getPaymentDetailsResponse.ok) {
        throw new Error(
          `Fallo al obtener datos del pago ${paymentId} desde Mercado Pago.`
        );
      }

      const {
        status,
        metadata: { user_data: userData },
        status_detail,
        transaction_amount,
        fee_details,
        transaction_details,
        currency_id,
      } = await getPaymentDetailsResponse.json<MercadoPagoPaymentDetails>();
      const { organization_id, user_id } = userData;

      const { net_received_amount, total_paid_amount } = transaction_details;
      console.log(status, status_detail, transaction_details);

      switch (status) {
        case "approved":
          console.log("Detalles transacción:", {
            net_received_amount,
            total_paid_amount,
          });

          // Obtener tasa de cambio
          const openExchangeResponse = await this.openExchange({
            currency: "COP",
          });

          if (!openExchangeResponse.success) {
            throw new Error();
          }

          const { data } = openExchangeResponse;
          const {
            rate, // 0.000223...
          } = data;

          try {
            await c.env.CORE_SERVICE.mainDatabaseHandler({
              type: "organizations",
              query: {
                method: "updateOrganizationBalance",
                data: {
                  amountInUsdCents: Math.round(transaction_amount * rate * 100),
                  description: "Recarga de saldo",
                  feeInUsdCents: fee_details.reduce((sum, curr) => {
                    const feedUsd = curr.amount * rate; // COP -> USD
                    const feedUsdCent = Math.round(feedUsd * 100); // USD -> centavos
                    return sum + feedUsdCent; // Suma total de los fee
                  }, 0),
                  fxRateUsed: rate,
                  type: "recharge",
                  originalPaymentAmount: transaction_amount,
                  originalPaymentCurrency: currency_id,
                  originalFeeAmount: fee_details.reduce(
                    (sum, curr) => sum + curr.amount,
                    0
                  ),
                },
              },
              userData: {
                organizationId: organization_id,
                userId: user_id,
              },
            });

            return c.json({}, 200);
          } catch (error) {
            console.error(
              "El procesamiento de la recarga ha fallado definitivamente. Iniciando plan de contingencia...",
              error
            );
            // Aquí puedes agregar lógica para enviar a Dead Letter Queue
          }
          break;

        case "rejected":
          console.log(
            `[Webhook] PAGO RECHAZADO para el pago ${paymentId}. Razón: ${status_detail}`
          );
          break;

        case "cancelled":
          console.log(
            `[Webhook] PAGO CANCELADO para el pago ${paymentId}. Razón: ${status_detail}`
          );
          break;

        default:
          console.warn(
            `[Webhook] Estado no manejado para el pago ${paymentId}: ${status}`
          );
      }

      return c.json({}, 200);
    });

    // Creación de preferencia de pago de mercadopago.
    this.app.post("/mercadopago/create-preference", async (c) => {
      const { amount, userData } = await c.req.json();

      // Validar que el monto, por el momento COP, sea mayor o igual a 10.000
      /*
      if (amount < 10000) {
        throw new Error();
      }
       */
      const APP_URL = "https://46bfd9a422af.ngrok-free.app";
      const orderId = crypto.randomUUID();

      try {
        const preferenceResponse = await fetch(
          "https://api.mercadopago.com/checkout/preferences",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${c.env.MERCADOPAGO_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
              items: [
                {
                  id: orderId,
                  title: "Recarga de saldo",
                  currency_id: "COP",
                  quantity: 1,
                  unit_price: amount,
                },
              ],
              back_urls: {
                success: `${APP_URL}/payment-feedback?status=success`,
                failure: `${APP_URL}/payment-feedback?status=failure`,
                pending: `${APP_URL}/payment-feedback?status=pending`,
              },
              external_reference: "orderId",
              metadata: {
                userData,
              },
            }),
          }
        );

        const preference = await preferenceResponse.json<{
          id: string;
          init_point: string;
        }>();
        const { id, init_point } = preference;

        return c.json<ServiceResponse<MercadoPagoPreference, any>>({
          success: true,
          data: {
            id,
            initPoint: init_point,
          },
        });
      } catch (error) {
        console.error("Error al crear la preferencia de pago:", error);
        return c.json<ServiceResponse<any, string>>({
          success: false,
          error: "Error creando la preferencia de pago.",
        });
      }
    });
  }

  /**
   * Cambia la moneda local por dolares (USD)
   * @param props La moneda local a convertir
   */
  async openExchange(props: {
    currency: string;
  }): Promise<ServiceResponse<OpenExchangeResponse, any>> {
    const { currency } = props;
    const localCurrency = currency.toUpperCase();

    // La clave de caché ahora refleja que guardamos la tasa de conversión A USD.
    const cacheKey = `fx-rate:${localCurrency}_TO_USD`;
    const ttlInSeconds = 2700; // 1 hora de caché

    try {
      // 1. Intentar obtener la tasa de conversión A USD desde el caché
      const cachedRateData =
        await this.env.SYSTEM_CACHE.get<OpenExchangeResponse>(cacheKey, {
          type: "json",
        });

      // 2. CACHE HIT: Si la tasa existe en el caché, la devolvemos.
      if (cachedRateData) {
        console.log(
          `[CACHE HIT] Tasa para ${localCurrency}_TO_USD desde caché.`
        );
        const { from, rate, to } = cachedRateData;

        return {
          success: true,
          data: {
            from,
            to,
            rate,
          },
        };
      }

      // 3. CACHE MISS: La tasa no está en caché, llamar a la API externa.
      console.log(
        `[CACHE MISS] Tasa para ${localCurrency}_TO_USD no encontrada. Llamando a API.`
      );

      // La API nos da la tasa de USD -> Moneda Local
      const apiUrl = `https://openexchangerates.org/api/latest.json?app_id=${this.env.OPENEXCHANGE_APP_ID}&base=USD&symbols=${localCurrency}`;
      const apiResponse = await fetch(apiUrl);

      if (!apiResponse.ok) {
        console.error(
          `Error al llamar a la API externa: ${apiResponse.statusText}`
        );
        throw new Error();
      }

      const data = await apiResponse.json<OpenExchangeAPIResponse>();

      // Esta es la tasa USD -> Moneda Local (ej: 4144.33)
      const usdToLocalRate = data.rates?.[localCurrency];

      if (typeof usdToLocalRate !== "number" || usdToLocalRate === 0) {
        throw new Error();
      }

      console.log(
        `[API FETCH] Tasa USD -> ${localCurrency} obtenida: ${usdToLocalRate}`
      );

      // 4. Calculamos la tasa inversa: Moneda Local -> USD (1 / tasa)
      const localToUsdRate = 1 / usdToLocalRate;
      console.log(
        `[CALCULATION] Tasa ${localCurrency} -> USD calculada: ${localToUsdRate}`
      );

      // 5. Guardamos la tasa INVERSA (la que nos interesa) en el caché.
      // La guardamos como string para KV. waitUntil se sigue ejecutando incluso si se envia una respuesta al usuario.
      this.ctx.waitUntil(
        this.env.SYSTEM_CACHE.put(
          cacheKey,
          JSON.stringify({
            from: localCurrency,
            to: "USD",
            rate: localToUsdRate,
          }),
          {
            expirationTtl: ttlInSeconds,
          }
        )
      );

      // 6. Devolvemos la tasa INVERSA en la respuesta.
      return {
        success: true,
        data: {
          from: localCurrency,
          to: "USD",
          rate: localToUsdRate,
        },
      };
    } catch (error) {
      console.error(
        `Error inesperado en /fx-rate/to-usd/${localCurrency}:`,
        error
      );
      return { success: false, error: "An internal server error occurred" };
    }
  }

  /**
   * Gestiona las ventanas requeridas para el procesamiento de un pago.
   * @param props
   */
  async mercadoPago(props: { currency: string }) {}
}

/*
app.get("/fx-rate/usd/:currency", async (c) => {
  const localCurrency = c.req.param("currency").toUpperCase();

  // La clave de caché ahora refleja que guardamos la tasa de conversión A USD.
  const cacheKey = `fx-rate:${localCurrency}_TO_USD`;
  const ttlInSeconds = 3600; // 1 hora de caché

  try {
    // 1. Intentar obtener la tasa de conversión A USD desde el caché
    const cachedRateString = await c.env.SYSTEM_CACHE.get(cacheKey);

    // 2. CACHE HIT: Si la tasa existe en el caché, la devolvemos.
    if (cachedRateString) {
      console.log(`[CACHE HIT] Tasa para ${localCurrency}_TO_USD desde caché.`);
      return c.json({
        from: localCurrency,
        to: "USD",
        rate: parseFloat(cachedRateString), // La tasa ya está en el formato que necesitamos
      });
    }

    // 3. CACHE MISS: La tasa no está en caché, llamar a la API externa.
    console.log(
      `[CACHE MISS] Tasa para ${localCurrency}_TO_USD no encontrada. Llamando a API.`
    );

    // La API nos da la tasa de USD -> Moneda Local
    const apiUrl = `https://openexchangerates.org/api/latest.json?app_id=${c.env.OPENEXCHANGE_APP_ID}&base=USD&symbols=${localCurrency}`;
    const apiResponse = await fetch(apiUrl);

    if (!apiResponse.ok) {
      console.error(
        `Error al llamar a la API externa: ${apiResponse.statusText}`
      );
      return c.json(
        { error: "Failed to fetch from external currency API" },
        502
      );
    }

    const data = await apiResponse.json<OpenExchangeResponse>();

    // Esta es la tasa USD -> Moneda Local (ej: 4144.33)
    const usdToLocalRate = data.rates?.[localCurrency];

    if (typeof usdToLocalRate !== "number" || usdToLocalRate === 0) {
      return c.json(
        { error: `Currency rate for '${localCurrency}' not found or invalid` },
        404
      );
    }

    console.log(
      `[API FETCH] Tasa USD -> ${localCurrency} obtenida: ${usdToLocalRate}`
    );

    // --- ¡LA CONVERSIÓN CLAVE! ---
    // 4. Calculamos la tasa inversa: Moneda Local -> USD (1 / tasa)
    const localToUsdRate = 1 / usdToLocalRate;
    console.log(
      `[CALCULATION] Tasa ${localCurrency} -> USD calculada: ${localToUsdRate}`
    );

    // 5. Guardamos la tasa INVERSA (la que nos interesa) en el caché.
    // La guardamos como string para KV.
    c.executionCtx.waitUntil(
      c.env.SYSTEM_CACHE.put(cacheKey, localToUsdRate.toString(), {
        expirationTtl: ttlInSeconds,
      })
    );
    console.log(
      `[CACHE WRITE] Guardando tasa ${localCurrency}_TO_USD en caché.`
    );

    // 6. Devolvemos la tasa INVERSA en la respuesta.
    return c.json({
      from: localCurrency,
      to: "USD",
      rate: localToUsdRate,
    });
  } catch (error) {
    console.error(
      `Error inesperado en /fx-rate/to-usd/${localCurrency}:`,
      error
    );
    return c.json({ error: "An internal server error occurred" }, 500);
  }
});
 */
