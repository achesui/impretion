import {
  OrdersConfiguration,
  ProcessedResponse,
} from "../../../../types";
import { Context } from "hono";
import { OpenRouterResponse } from "../../../../lib/openrouter/openrouter.types";
import { openRouter } from "../../../../lib/openrouter/completion";
import { catalogCheckPrompt } from "./instructions/catalog-check-prompt";
import { ActionData } from "../../../../types";
import { catalogCheckSchema } from "./instructions/catalog-check-schema";

type SchemaResponse = {
  productPrices: { product: string; price: number }[];
  isProcessable: boolean;
  orderDetails: {
    name: string;
    extras: [];
    modificables: [];
    customPreferences: string;
  }[];
  rejectedProducts: [];
};

export const catalogCheck = async (
  configuration: OrdersConfiguration,
  order: string,
  usage: { completionTokens: number; promptTokens: number },
  env: Env
): Promise<ProcessedResponse> => {
  try {
    const inventory = configuration.inventory.value.products;
    const catalog = catalogCheckPrompt(inventory);

    const completion: OpenRouterResponse = await openRouter(
      env,
      [
        { role: "system", content: catalog },
        { role: "user", content: order },
      ],
      ["openai/gpt-4o-mini"],
      { type: "json_schema", json_schema: catalogCheckSchema }
    );

    if (completion.choices[0].error || completion.error?.metadata) {
      return {
        success: false,
        error: "Error en el procesamiento de los datos.",
      };
    }

    const choice = completion.choices[0];
    console.log("CHOICE: ", choice);
    // Acumula el uso del toolCompletion
    usage.completionTokens += completion.usage?.completion_tokens || 0;
    usage.promptTokens += completion.usage?.prompt_tokens || 0;
    if ("message" in choice) {
      const parsedSchemaResponse: SchemaResponse = JSON.parse(
        choice.message.content!
      );

      const { productPrices, isProcessable, orderDetails, rejectedProducts } =
        parsedSchemaResponse;

      // Si la orden no es procesable, mostramos los productos que si se pueden procesar y los que no.
      if (!isProcessable) {
        let productsToProcess: string[] = [];
        orderDetails.map((orderDetail) => {
          productsToProcess.push(orderDetail.name);
        });

        return {
          success: true,
          message: `Lo sentimos, no tenemos los productos: ${rejectedProducts.join(
            ", "
          )}, sin embargo si tenemos: ${productsToProcess.join(", ")}.`,
        };
      }

      // Envío del QR de pago y creación de una nueva orden 'desactivada'

      return {
        success: true,
        message: choice.message.content,
      };
    }

    return {
      success: false,
      error: "Error al procesar la función.",
    };
  } catch (error) {
    console.error("error: ", error);
    return {
      success: false,
      error: "Error al procesar la función.",
    };
  }
};
