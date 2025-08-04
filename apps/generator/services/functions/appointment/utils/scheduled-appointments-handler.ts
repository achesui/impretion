import {
  GetActionResultsResponse,
  SelectIntegrationSchema,
} from "@core-service/types";
import {
  addOrSubstractFromDate,
  convertDateToUTC,
  formatTimeToMilitary,
} from "../../../utils";
import { ActionIntegration, UserData } from "../../../../src/types";
import { ActionQueryError } from "../../../../lib/errors";

type ProposedDates = {
  startDate: string;
  endDate: string;
};

export async function getDatabaseScheduledAppointments(
  proposedDates: ProposedDates,
  actionId: string,
  userData: UserData,
  env: Env,
) {
  const { startDate } = proposedDates;
  console.log("datos start ?> ", startDate);
  // Obtener todos los action_results para el actionId y la fecha especificada
  const actionResultsResponse = await env.CORE_SERVICE.mainDatabaseHandler({
    type: "actions",
    query: {
      method: "getActionResults",
      data: {
        id: actionId,
        filterResult: {
          path: "date",
          operator: "=",
          value: startDate,
        },
      },
    },
    userData,
  });
  console.log("Query de action results response -> ", actionResultsResponse);

  if (!actionResultsResponse.success) {
    throw new ActionQueryError({
      name: "ACTION_QUERY_ERROR",
      message: `Ha ocurrido un error al obtener la disponibilidad de citas.`,
    });
  }

  const actionResults =
    actionResultsResponse.data as GetActionResultsResponse[];

  return actionResults.length > 0
    ? actionResults
        .filter((row) => {
          const status = row.status; // Access status directly from row.status
          return status !== "cancelled" && status !== "completed"; // Filter out 'canceled' and 'completed'
        })
        .map((row) => {
          const { time } = row.result; // Extract date and time from row.result
          return time; // Return the desired { time }[] object array
        })
    : [];
}

type CalendlyScheduledEventsType = {
  collection: {
    calendar_event: null;
    created_at: string;
    end_time: string;
    start_time: string;
    status: string;
    updated_at: string;
  }[];
  pagination: {
    count: number;
    next_page: null | number;
    next_page_token: null | string;
    previous_page: null | number;
    previous_page_token: null | number;
  };
};

export async function getCalendlyAppointments(
  currentIntegration: ActionIntegration,
  proposedDates: ProposedDates,
  userData: UserData,
  env: Env,
) {
  const { startDate, endDate } = proposedDates;

  // Obtenemos por defecto el acess token actual, aunque si el token esta a punto de expirar se renueva.
  const encryptedAccessToken = await getAccessToken(
    currentIntegration,
    userData,
    env,
  );

  console.log("encryptedAccessToken => ", encryptedAccessToken);
  // Obtención del access token del usuario actual.
  const getOAuthCalendlyResponse = await env.CRYPTO_SERVICE.symmetricOperation({
    action: "decrypt",
    data: encryptedAccessToken,
  });

  if (!getOAuthCalendlyResponse.success) throw new Error();

  const { data: calendlyAccessToken } = getOAuthCalendlyResponse;

  const fullIntegrationData = await getFullIntegrationData(
    currentIntegration.integrationId,
    currentIntegration.service,
    // El id del usuario se obtiene desde los datos de configuración de la misma integración (obtenidos desde el cliente)
    {
      organizationId: userData.organizationId,
      userId: currentIntegration.userId,
    },
    env,
  );

  console.log("todos los datos obtneidos => ", fullIntegrationData);
  const { metadata } = fullIntegrationData;
  const { owner } = metadata as Record<string, any>;

  const calendlyUser = owner;

  const allEvents: { startTime: string; endTime: string }[] = [];
  let nextPageToken: string | null = null;
  let hasMorePages = true;

  while (hasMorePages) {
    const url = new URL("https://api.calendly.com/scheduled_events");
    url.searchParams.append("user", calendlyUser);
    url.searchParams.append("min_start_time", convertDateToUTC(startDate));
    url.searchParams.append("max_start_time", convertDateToUTC(endDate));

    if (nextPageToken) {
      url.searchParams.append("page_token", nextPageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${calendlyAccessToken}`,
        "Content-Type": "application/json",
      },
      method: "GET",
    });

    const scheduledEvents = await response.json<CalendlyScheduledEventsType>();

    const processedEvents = scheduledEvents.collection.map((event) => ({
      endTime: formatTimeToMilitary(event.end_time),
      startTime: formatTimeToMilitary(event.start_time),
    }));

    allEvents.push(...processedEvents);
    nextPageToken = scheduledEvents.pagination.next_page_token;
    hasMorePages = nextPageToken !== null;
  }

  return allEvents;
}

// Tipo para los servicios disponibles
type IntegrationService = "calendly";
export async function integrationsHandler(
  integration: ActionIntegration,
  proposedDates: ProposedDates,
  userData: UserData,
  env: Env,
) {
  const service = integration.service as IntegrationService;

  const currentServiceIntegrations = {
    calendly: await getCalendlyAppointments(
      integration,
      proposedDates,
      userData,
      env,
    ),
  };

  // Verificar si el servicio existe
  if (!currentServiceIntegrations[service]) {
    throw new Error(`Servicio "${service}" no está disponible`);
  }

  return currentServiceIntegrations[service];
}

// Obtener todos los resultados de schedules (base de datos - servicios) y convertimos todo en un solo array de objetos.
export async function getSchedules(
  proposedDate: string,
  actionIntegrations: ActionIntegration[],
  actionId: string,
  userData: UserData,
  env: Env,
) {
  console.log("hora propesta ", proposedDate);
  // Se hace un calculo obteniendo el día propuesto del usuario + 1 día obteniendo la franja de 24 horas de una día.
  const startDate = proposedDate;
  const endDate = addOrSubstractFromDate(startDate, 1, "add");

  // Objeto con la franja de 24 horas segun la fecha propuesta por el usuario.
  const proposedDates = {
    startDate,
    endDate,
  };

  // 1. Obtener citas programadas directamente desde la base de datos
  const databaseSchedules = await getDatabaseScheduledAppointments(
    proposedDates,
    actionId,
    userData,
    env,
  );

  // 2. Obtener citas programadas desde los servicios conectados a esta acción (integraciones)
  const integrationSchedules = await Promise.all(
    actionIntegrations.map((integration) =>
      integrationsHandler(integration, proposedDates, userData, env),
    ),
  );

  // 3. Aplanar el array de arrays de integraciones en un solo array
  const flattenedIntegrationSchedules = integrationSchedules.flat();

  // Unificar ambos arrays en un solo array de objetos
  const allSchedules = [...databaseSchedules, ...flattenedIntegrationSchedules];

  return allSchedules;
}

type SelectFullIntegrationSchema = SelectIntegrationSchema & {
  accessToken: string;
  refreshToken: string;
};

export async function getAccessToken(
  currentIntegration: ActionIntegration,
  userData: UserData,
  env: Env,
) {
  const { integrationId, tokenData, service, userId } = currentIntegration;
  const { expiresAt } = tokenData;
  const { organizationId } = userData;

  // Verificar si el token expira en los próximos 10 minutos
  // parseamos expiresAt a date por seguridad y porque desde la configuración de la acción que viene desde el cliente viene en "string":
  const expiresDate =
    typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;

  // Calculo del umbral de renovación:
  // (ahora + 10 minutos)
  const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000);

  // Comparación númerica, esto es mucho más seguro que comparar por fechas.
  const needsRenewal = expiresDate.getTime() <= tenMinutesFromNow.getTime();
  console.log("needsRenewal => ", needsRenewal);

  if (!needsRenewal) {
    // Si el access token está por expirar, obtenemos el refresh token y renovamos el access token
    const integrationTokens = await getFullIntegrationData(
      integrationId,
      service,
      { organizationId, userId },
      env,
    );

    const { refreshToken } = integrationTokens;

    // Renovar el access token
    const regeneratedAccessToken = await env.CORE_SERVICE.mainDatabaseHandler({
      type: "users",
      query: {
        method: "createOrUpdateIntegration",
        data: {
          operation: "update",
          id: integrationId,
          values: {
            refreshToken: refreshToken,
            service: service,
          },
        },
      },
      userData: {
        userId,
        organizationId,
      },
    });

    if (!regeneratedAccessToken.success) {
      throw new Error();
    }

    const { accessToken } = regeneratedAccessToken.data as {
      accessToken: string;
    };

    return accessToken; // "update" solo retorna el nuevo access token
  } else {
    // Si no necesita renovación, obtenemos el token actual del cache o DB
    const integrationTokens = await getFullIntegrationData(
      integrationId,
      service,
      {
        organizationId,
        userId,
      },
      env,
    );

    return integrationTokens.accessToken;
  }
}

/**
 * Obtención de el access y refresh token de la acción por medio del id de la integración del usuario.
 * El 'accessToken' y 'refreshToken' no se obtienen directamente de currentIntegration ya que estos datos provienen del cliente.
 * Obtenemos estos datos desde el servidor por SEGURIDAD.
 */
async function getFullIntegrationData(
  integrationId: string,
  service: string,
  userData: UserData,
  env: Env,
): Promise<SelectFullIntegrationSchema> {
  const { organizationId, userId } = userData;

  // Intentar obtener desde cache primero
  const getIntegrationTokens = await env.CORE_SERVICE.storageCacheHandler({
    type: "getCache",
    data: {
      organizationId,
      segments: [{ entity: "integrations", identifier: integrationId }],
    },
    withMetadata: false,
  });

  if (getIntegrationTokens.success) {
    console.log("getIntegrationTokens.data : ", getIntegrationTokens.data);
    return getIntegrationTokens.data as SelectFullIntegrationSchema;
  }

  // Fallback: obtener desde base de datos
  const getIntegrationTokensResponse =
    await env.CORE_SERVICE.mainDatabaseHandler({
      type: "users",
      query: {
        method: "getUserData",
        data: {
          service,
          withIntegrations: true,
          withAccessToken: true,
          withRefreshToken: true,
        },
      },
      userData: {
        organizationId,
        userId,
      },
    });

  if (getIntegrationTokensResponse.success) {
    const data = getIntegrationTokensResponse.data as {
      integrations: SelectFullIntegrationSchema[];
    };

    const { integrations } = data;

    const integration = integrations.find(
      (integration) => integration.service === service,
    ) as SelectFullIntegrationSchema;

    return integration as SelectFullIntegrationSchema;
  }

  throw new Error("No se pudieron obtener los tokens de integración");
}
