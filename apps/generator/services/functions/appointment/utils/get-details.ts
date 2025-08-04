import { ServiceResponse } from "../../../../../global";
import { GetActionResultsResponse } from "@core-service/types";

export const getDetails = async (
  code: string,
  actionId: string,
  organizationId: string,
  env: Env
): Promise<ServiceResponse<GetActionResultsResponse, string>> => {
  try {
    const actionResult = await env.CORE_SERVICE.mainDatabaseHandler({
      type: "actions",
      query: {
        method: "getActionResults",
        data: {
          id: actionId,
          filterResult: {
            path: "code",
            operator: "=",
            value: code,
          },
        },
      },
      userData: {
        organizationId: organizationId,
      },
    });

    if (!actionResult.success) {
      return {
        success: false,
        error: `Ocurrio un error obteniendo los detalles de la cita.`,
      };
    }

    const actionResultDetails = actionResult.data as GetActionResultsResponse[];

    if (actionResultDetails.length === 0) {
      return {
        success: false,
        error: `No pude encontrar los detalles de la cita con el código ${code}. Valida que el código que me estas proporcionando este correcto por favor.`,
      };
    }

    return {
      success: true,
      data: actionResultDetails[0],
    };
  } catch (error) {
    return {
      success: false,
      error: `Parece que ha ocurrido un error obteniendo los detalles de la cita.`,
    };
  }
};
