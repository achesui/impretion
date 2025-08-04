/*
import { Context } from "hono";
import {
  ActionState,
  Orders,
  OrdersConfiguration,
  OrdersResponseCatalog,
} from "../../../types";
import { catalogCheck } from "./utils/catalog-check";
import { ActionData } from "../../../types";
import { newActionResult } from "../../new-action-result";
import { codeGenerator } from "../../../lib/function-calling/code-generator";

export const orders = async (
  state: ActionState,
  functionType: string,
  actionData: ActionData,
  functionArguments: Orders,
  assistantId: string,
  actionsContextResponse: string[],
  usage: { completionTokens: number; promptTokens: number },
  env: Env
): Promise<any> => {
  try {
    const { actionType, order } = functionArguments;
    // Muestra el catalogo de la empresa
    if (actionType === "catalog") {
      const { actionId, configuration } = actionData["orders"];
      const catalog = await catalogCheck(configuration, order, usage, env);

      if (!catalog.success) {
        return "Lo siento, parece que ha ocurrido un error, ¿podrías por favor intentarlo de nuevo?";
      }

      return catalog.message;
    }

    if (actionType === "create") {
      const { actionId, configuration } = actionData["orders"];
      const catalog = await catalogCheck(configuration, order, usage, env);

      state.orderState.lastOrder = 1;
      if (!catalog.success) {
        return "Lo siento, parece que ha ocurrido un error, ¿podrías por favor intentarlo de nuevo?";
      }

      // Obtener costos totales
      const orderDetails: OrdersResponseCatalog = catalog.message;
      const totalPrice = orderDetails.productPrices.reduce(
        (accumulator, product) => {
          return accumulator + product.price * product.quantity;
        },
        0
      );

      // Genera un código de orden único
      const newOrderCode = codeGenerator();

      const newResult = await newActionResult(
        assistantId,
        functionType,
        { ...functionArguments, code: newOrderCode },
        actionId,
        env
      );

      if (!newResult.success) {
        return "Lo siento, parece que ha ocurrido un error, ¿podrías por favor intentarlo de nuevo?";
      }

      const response = await fetch("https://localhost:3005/triggered-message", {
        method: "POST",
        body: JSON.stringify({
          actionId,
          code: newOrderCode,
        }),
      });

      if (!response.ok) {
        return "Lo siento, parece que ha ocurrido un error, ¿podrías por favor intentarlo de nuevo?";
      }

      return "Pedido realizado con exito.";
    }

    assistantId,
      userPrompt: userMessage,
      systemPrompt: "Eres un asistente muy amable y respetuoso.",
      from: userWhatsappNumber,
      to: directWhatsappNumber,
      organizationId,
      source: "whatsapp",

    if (actionType === "update") {
      const { actionId, configuration } = actionData["orders"];
      console.log("argumentos: ", functionArguments);
      const catalog = await catalogCheck(configuration, order, usage, env);

      if (!catalog.success) {
        return "Lo siento, parece que ha ocurrido un error, ¿podrías por favor intentarlo de nuevo?";
      }

      return "Pedido actualizado con exito.";
    }

    if (actionType === "cancel") {
      const { actionId, configuration } = actionData["orders"];
      console.log("argumentos: ", functionArguments);

      return "Pedido cancelado con exito.";
    }

    return "Ha ocurrido un error inesperado.";
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Error al procesar la función.",
    };
  }
};
 */
