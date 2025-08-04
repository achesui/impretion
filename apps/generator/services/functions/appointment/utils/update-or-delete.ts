import { Client } from "@neondatabase/serverless";
import { ActionQueryError } from "../../../../lib/errors";
import { AppointmentsArgs, UserData } from "../../../../src/types";
import { appoinmentStatus } from "..";

export const updateOrDelete = async (
  actionId: string,
  functionArguments: AppointmentsArgs,
  appointmentDetails: Record<string | number, string | number>,
  type: "update" | "cancel",
  userData: UserData,
  env: Env,
): Promise<any> => {
  // operador spread para obtener unicamente los campos que se van a actualizar.
  const { code, actionType, ...fieldsToBeUpdated } = functionArguments;
  try {
    if (type === "update") {
      env.CORE_SERVICE.mainDatabaseHandler({
        type: "actions",
        query: {
          method: "getActionResults",
          data: {
            id: actionId,
            filterResult: {
              path: "date",
              operator: "=",
              value: "startDate",
            },
          },
        },
        userData,
      });

      const updateQuery = `
				UPDATE action_results
				SET result = result || $1::jsonb
				WHERE action_id = $2
					AND result->>'code' = $3
				RETURNING id;
	  		`;

      // Filtrar el objeto para evitar cadenas falsy y campos restringidos.
      const filteredFields = Object.fromEntries(
        Object.entries(fieldsToBeUpdated).filter(
          ([key, value]) =>
            value !== "" &&
            value !== undefined &&
            value !== null &&
            key !== "name" &&
            key !== "code",
        ),
      );

      const actionResultData = (
        await client.query(updateQuery, [filteredFields, actionId, code])
      ).rows[0];

      if (actionResultData.id) {
        const updateMetadata = `
				UPDATE action_results
				SET metadata = jsonb_set(
					COALESCE(metadata, '{}'::jsonb),
					'{updates}',
					COALESCE(metadata->'updates', '[]'::jsonb) || $1::jsonb,
					true
				)
				WHERE action_id = $2
				  AND result->>'code' = $3
				RETURNING id;
			  `;

        // Detectar los cambios comparando filteredFields con appointmentDetails.
        const updates: { [key: string]: { old: any; new: any } } = {};
        Object.entries(filteredFields).forEach(([key, newValue]) => {
          if (appointmentDetails[key] !== newValue) {
            updates[key] = {
              old: appointmentDetails[key],
              new: newValue,
            };
          }
        });

        // Insertar los cambios en la columna 'metadata' dentro de la clave 'updates' como un array.
        if (Object.keys(updates).length > 0) {
          // Formatear los cambios para el historial
          const updatesArray = Object.entries(updates).map(([key, values]) => ({
            field: key,
            from: values.old,
            to: values.new,
            timestamp: new Date().toISOString(), // Agregar una marca de tiempo
          }));

          const updatedMetadataResult = await client.query(updateMetadata, [
            JSON.stringify(updatesArray),
            actionId,
            code,
          ]);
          console.log(
            "Metadata actualizada, ID:",
            updatedMetadataResult.rows[0]?.id,
          );
        }

        return {
          success: true,
          data: `Tu cita para el ${functionArguments.date} a las ${functionArguments.time} con codigo [{${code}}] ha sido actualizada con éxito.`,
        };
      } else {
        return {
          success: false,
          error: `No se pudo actualizar la cita del usuario. ${retryPrompt}`,
        };
      }
    } else if (type === "cancel") {
      const canceledActionResult = await client.query(
        `
				UPDATE action_results SET status = $1 				
				WHERE action_id = $2
				AND result->>'code' = $3
				RETURNING id`,
        [appoinmentStatus.CANCELED, actionId, code],
      );

      console.log("action result cancelada: ", canceledActionResult);

      if (canceledActionResult.rows.length === 0) {
        return {
          success: false,
          error: `Hubo un error al cancelar la cita.`,
        };
      }

      return {
        success: true,
        data: `Tu cita para el ${functionArguments.date} a las ${functionArguments.time} con código ${code} ha sido cancelada con éxito.`,
      };
    }

    throw new ActionQueryError({
      name: "ACTION_QUERY_ERROR",
      message: DEFAULT_ERROR_MESSAGE,
    });
  } catch (error) {
    if (error instanceof ActionQueryError) {
      return { success: false, error: error.message };
    }

    return {
      success: false,
      error: `Ha ocurrido un error inesperado en el sistema ${retryPrompt}`,
    };
  }
};
