import { NeonQueryFunction } from "@neondatabase/serverless";
import { ServiceResponse, UserData } from "../../../../../global";
import { AppointmentsArgs } from "../../../../src/types";
import { GetActionResultsResponse } from "@core-service/types";

export const collisionVerifier = async (
  functionArguments: AppointmentsArgs,
  actionId: string,
  userData: UserData,
  env: Env,
): Promise<ServiceResponse<any, any>> => {
  const { date, time } = functionArguments;
  const { organizationId } = userData;

  try {
    const actionResultsResponse = await env.CORE_SERVICE.mainDatabaseHandler({
      type: "actions",
      query: {
        method: "getActionResults",
        data: {
          id: actionId,
          filterResult: {
            operator: "@>",
            value: { date, time }, // { date: "2024-09-16", time: "15:00" }
          },
        },
      },
      userData: {
        organizationId: organizationId,
      },
    });

    console.log("resultado dentro de la colision =< ", actionResultsResponse);

    if (!actionResultsResponse.success) {
      throw new Error();
    }

    const actionResults =
      actionResultsResponse.data as GetActionResultsResponse;

    // Validar si hay colisiones
    const hasCollision = actionResults.length > 0;

    return {
      success: true,
      data: hasCollision, // true si hay colisión, false si no
    };
  } catch (error) {
    // Manejo de errores en la consulta
    console.error("Error en collisionVerifier:", error);

    // Retornar un mensaje de error detallado si ocurre un problema en la DB
    return {
      success: false,
      error: `Ha ocurrido un error externo.`,
    };
  }
};
