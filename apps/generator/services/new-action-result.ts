import { ActionQueryError } from "../lib/errors";
import { ServiceResponse, UserData } from "../../global";
import { NeonQueryFunction } from "@neondatabase/serverless";
import { actionStatus } from "./utils";
import { GetActionResultsResponse } from "@core-service/types";

// Guarda el resultado de una nueva acción en la base de datos
export const newActionResult = async (
  assistantId: string,
  functionType: string,
  functionArguments: Record<string, any>,
  actionId: string,
  userData: UserData,
  env: Env
): Promise<ServiceResponse<GetActionResultsResponse, string>> => {
  const { organizationId } = userData;

  try {
    // Obtener el tipo de acción usando el functionType
    if (!functionType) {
      return {
        success: false,
        error:
          "No se encontró el tipo de acción para el nombre de función proporcionado.",
      };
    }

    // Guardar el resultado de la acción con RETURNING id
    // Eliminar el returning para que no se devuelva el id y generar un error para pruebas

    const createActionResultResponse =
      await env.CORE_SERVICE.mainDatabaseHandler({
        type: "actions",
        query: {
          method: "createOrUpdateActionResult",
          data: {
            operation: "create",
            values: {
              actionId,
              assistantId,
              createdAt: new Date(),
              metadata: null,
              result: functionArguments,
              status: actionStatus.PENDING,
            },
          },
        },
        userData: {
          organizationId: organizationId,
        },
      });

    if (!createActionResultResponse.success) {
      throw new ActionQueryError({
        name: "ACTION_QUERY_ERROR",
        message: "Ha ocurrido un error inesperado en la creación de los datos.",
      });
    }

    const createActionResult =
      createActionResultResponse.data as GetActionResultsResponse;

    return { success: true, data: createActionResult };
  } catch (error) {
    if (error instanceof ActionQueryError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "Ha ocurrido un error inesperado al crear una nueva acción.",
    };
  }
};
