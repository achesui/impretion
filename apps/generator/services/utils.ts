/**
 * ARCHIVO AUXILIAR CON FUNCIONES PARA TODAS LAS ACCIONES
 */

import { ServiceResponse } from "../../global";

// Posibles estados de una accion
export const actionStatus = {
  COMPLETED: "completed",
  PENDING: "pending",
  CANCELLED: "cancelled",
  RUNNING: "running",
  FAILED: "failed",
} as const;

export const trimIndentation = (text: string): string => {
  return text.replace(/^[ \t]+/gm, "").trim();
};

// Parte la fecha en tres, diviendo el año, mes y dia.
export const getDatePart = (
  dateString: string,
  part: "year" | "month" | "day"
) => {
  const [year, month, day] = dateString.split("-"); // Divide la cadena en partes

  switch (part) {
    case "year":
      return year;
    case "month":
      return month;
    case "day":
      return day;
    default:
      return null;
  }
};

export const actionContextBuilder = (actionType: string, data: any): string => {
  if (actionType === "appointments") {
    return appointmentConfiguration(data);
  }

  return "";
};

const appointmentConfiguration = (data: {
  schedule: {
    id: number;
    value: Record<string, any>;
  };
  timeZone: Record<string, any>;
  startDate: Record<string, any>;
  slotInterval: Record<string, any>;
  maxAppointmentsPerDay: Record<string, any>;
}) => {
  const { day, month, year, hour, minute } = getCurrentDate();
  let availabilityInfo = "";
  if (data?.schedule?.value) {
    availabilityInfo += "\n**Horario de Citas:**\n"; // More direct heading

    for (const [day, availability] of Object.entries(data.schedule.value)) {
      if (availability.isEnabled) {
        availabilityInfo += `- **${day}:** Citas disponibles de ${availability.startTime} a ${availability.endTime}.\n`;
      } else {
        availabilityInfo += `- **${day}:** No se agendan citas.\n`;
      }
    }
  } else {
    availabilityInfo +=
      "\n**Horario de Citas:** No hay información de horario disponible.\n";
  }

  return trimIndentation(`
		**Contexto para agendar citas:**
		${availabilityInfo}
		**Información Adicional:**
		- **Valores de Configuración:** Proporcione estos detalles al usuario según sea necesario.
		- **Acciones del Usuario:** El usuario puede realizar las siguientes acciones acerca de sus citas:
			- Agendar una cita.
			- Actualizar una cita existente.
			- Cancelar una cita.
			- Consultar los detalles de una cita.
			- Verificar la disponibilidad de citas para una fecha específica.
      - **ABSOLUTAMENTE SIEMPRE** ten en cuenta que es el día ${day} del mes ${month} del año ${year} y la hora es ${hour}:${minute} a la hora de agendar citas.
    `);
};

export const getCurrentDate = (): {
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
} => {
  // Bogotá está en UTC-5 todo el año (no hay horario de verano)
  const options: any = {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };

  const formatter = new Intl.DateTimeFormat("es-CO", options);
  const parts = formatter.formatToParts(new Date());

  // Extraer componentes individuales y convertirlos a números
  const day = Number(parts.find((p) => p.type === "day")?.value || 12);
  const month = Number(parts.find((p) => p.type === "month")?.value || 12);
  const year = Number(parts.find((p) => p.type === "year")?.value || 2022);
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 12);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);

  return { day, month, year, hour, minute };
};

/**
 * Normaliza y valida una fecha y hora proporcionadas por el usuario.
 *
 * Pasos que realiza:
 * 1. Valida que la fecha tenga formato ISO “YYYY-MM-DD”.
 * 2. Convierte horas en formato 12 h (AM/PM) o 24 h a “HH:MM”.
 * 3. Detecta fechas inválidas (31-02-2024, etc.) y años futuros.
 * 4. Corrige automáticamente años anteriores al actual.
 * 5. Rechaza fechas u horas que ya hayan pasado con respecto al momento actual.
 * 6. Devuelve un objeto `ServiceResponse` que indica éxito o el tipo de error encontrado.
 *
 * @param proposedDate Fecha en formato “YYYY-MM-DD” o `null`.
 * @param proposedHour Hora en formato “HH:MM”, “HHMM”, “H:MM AM/PM” o `null`.
 * @returns `ServiceResponse<null>` con `success: true` si todo es válido,
 *          o `success: false` con `error.type` descriptivo si hay algún problema.
 */
export const cleanDate = (
  proposedDate: string | null,
  proposedHour: string | null
): ServiceResponse<null, any> => {
  // Valida si la fecha tiene el formato YYYY-MM-DD
  const validateDateFormat = (date: string): boolean => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(date);
  };

  // Normaliza y valida el formato de la hora ingresada
  const validateHourFormat = (hour: string): string => {
    let normalizedHour = hour.toLowerCase().trim();
    const amPmMatch = normalizedHour.match(/^(\d{1,2}):(\d{2})\s*([ap])m$/i);
    if (amPmMatch) {
      let [, hours, minutes, meridiem] = amPmMatch;
      let hoursNum = parseInt(hours);
      if (meridiem === "p") {
        hoursNum = hoursNum === 12 ? 12 : hoursNum + 12;
      } else {
        hoursNum = hoursNum === 12 ? 0 : hoursNum;
      }
      normalizedHour = `${hoursNum.toString().padStart(2, "0")}:${minutes}`;
    } else if (/^\d{4}$/.test(normalizedHour)) {
      normalizedHour = `${normalizedHour.slice(0, 2)}:${normalizedHour.slice(
        2
      )}`;
    }
    if (!/^\d{2}:\d{2}$/.test(normalizedHour)) {
      normalizedHour = "00:00";
    }
    return normalizedHour;
  };

  // Verifica si la fecha es válida considerando límites de año y la existencia del día
  const isValidDate = (
    year: number,
    month: number,
    day: number
  ): { success: boolean; type?: string } => {
    const currentYear = new Date().getFullYear();
    if (year > currentYear) {
      return { success: false, type: "yearsExceeded" };
    }
    if (month < 1 || month > 12) {
      return { success: false, type: "invalidMonth" };
    }
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return { success: false, type: "invalidDate" };
    }
    return { success: true };
  };

  // Obtiene la fecha y hora actual
  const {
    year: currentYear,
    month: currentMonth,
    day: currentDay,
    hour: currentHour,
    minute: currentMinute,
  } = getCurrentDate();

  let normalizedHour = proposedHour ? validateHourFormat(proposedHour) : null;
  let proposedYearNum: number | null = null;
  let proposedMonthNum: number | null = null;
  let proposedDayNum: number | null = null;
  let yearCorrected = false;

  if (proposedDate) {
    // Valida si la fecha tiene el formato correcto
    if (!validateDateFormat(proposedDate)) {
      return {
        success: false,
        error: { type: "formatError", message: "Formato de fecha inválido." },
      };
    }
    let [proposedYear, proposedMonth, proposedDay] = proposedDate
      .split("-")
      .map(Number);
    if (proposedYear < currentYear) {
      proposedYear = currentYear;
      yearCorrected = true;
    }
    proposedYearNum = proposedYear;
    proposedMonthNum = proposedMonth;
    proposedDayNum = proposedDay;

    // Verifica si la fecha es válida
    const dateValidation = isValidDate(
      proposedYearNum,
      proposedMonthNum,
      proposedDayNum
    );
    if (!dateValidation.success) {
      return {
        success: false,
        error: {
          type: dateValidation.type || "dateError",
          message: null,
        },
      };
    }

    // Si la fecha corregida sigue estando en el pasado, devolver un error
    if (
      proposedYearNum === currentYear &&
      (proposedMonthNum < currentMonth ||
        (proposedMonthNum === currentMonth && proposedDayNum < currentDay))
    ) {
      return {
        success: false,
        error: {
          type: "pastDateError",
          message: null,
        },
      };
    }
  }

  if (normalizedHour) {
    const [proposedHourNumber, proposedMinute] = normalizedHour
      .split(":")
      .map(Number);
    // Si la fecha es hoy, verifica que la hora no haya pasado
    if (
      proposedDate &&
      proposedYearNum === currentYear &&
      proposedMonthNum === currentMonth &&
      proposedDayNum === currentDay
    ) {
      if (
        proposedHourNumber < currentHour ||
        (proposedHourNumber === currentHour && proposedMinute < currentMinute)
      ) {
        return {
          success: false,
          error: { type: "pastHourError", message: null },
        };
      }
    }
  }

  if (yearCorrected) {
    return {
      success: false,
      error: {
        type: "yearError",
        data: `${proposedYearNum}-${String(proposedMonthNum).padStart(
          2,
          "0"
        )}-${String(proposedDayNum).padStart(2, "0")}`,
      },
    };
  }

  return {
    success: true,
    data: null,
  };
};

/**
 * Genera un código aleatorio.
 * @returns
 */
export const codeGenerator = () => {
  const min = 100000;
  const max = 999999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
};

// Define el tipo para los días de la semana
type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/**
 * Obtiene el día de la semana segun la fecha pasada.
 * @param dateString
 * @returns
 */
export const getDayOfTheWeek = (dateString: string): DayOfWeek => {
  // Convertir la cadena a componentes numéricos
  const [year, month, day] = dateString.split("-").map(Number);
  const mapDay: Record<string, DayOfWeek> = {
    lunes: "monday",
    martes: "tuesday",
    miércoles: "wednesday",
    jueves: "thursday",
    viernes: "friday",
    sábado: "saturday",
    domingo: "sunday",
  };

  // Crear fecha en UTC equivalente a medianoche en Bogotá (UTC-5)
  const bogotaDate = new Date(
    Date.UTC(
      year,
      month - 1, // Los meses en Date son 0-based
      day,
      5, // +5 horas UTC = medianoche en Bogotá
      0,
      0
    )
  );

  // Formatear con configuración precisa
  const dayOfTheWeek = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    timeZone: "America/Bogota",
    timeZoneName: "shortOffset",
  })
    .format(bogotaDate)
    .replace(/,\s+GMT-5$/, "");

  console.log("Día de la semana en Bogotá:", dayOfTheWeek);

  return mapDay[dayOfTheWeek.toLowerCase()];
};

export const addOrSubstractFromTime = (
  time: string,
  minutes: number,
  operation = "add"
) => {
  // Validaciones
  if (typeof minutes !== "number" || isNaN(minutes)) {
    throw new Error("Los minutos deben ser un número válido");
  }

  if (operation !== "add" && operation !== "subtract") {
    throw new Error('La operación debe ser "add" o "subtract"');
  }

  const timeFormat = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  if (!timeFormat.test(time) && time.trim() !== "") {
    throw new Error("Formato de hora inválido. Use HH:MM (ej: 15:30)");
  }

  // Extraer horas y minutos
  const [horas, minutosActuales] = time.split(":").map(Number);

  // Determinar el signo según la operación
  const minutosASumar = operation === "add" ? minutes : -minutes;

  // Convertir todo a minutos
  let totalMinutos = horas * 60 + minutosActuales + minutosASumar;

  // Manejar casos negativos y superiores a 24 horas
  totalMinutos = ((totalMinutos % (24 * 60)) + 24 * 60) % (24 * 60);

  // Convertir de vuelta a horas y minutos
  const timeResult = Math.floor(totalMinutos / 60);
  const minutesResult = totalMinutos % 60;

  // Formatear con ceros a la izquierda
  return `${timeResult.toString().padStart(2, "0")}:${minutesResult
    .toString()
    .padStart(2, "0")}`;
};

export const formatTimeToMilitary = (time: string): string => {
  return new Date(time).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  });
};

/**
 * Suma o resta a una fecha en formato YYYY-MM-DD
 * @param dateString Fecha en formato YYYY-MM-DD
 * @param days Días a sumar/restar
 * @param operation restar/sumar
 * @returns Fecha con la substracción o adición
 */
export const addOrSubstractFromDate = (
  dateString: string,
  days: number,
  operation: "add" | "subtract"
): string => {
  const date = new Date(dateString);

  if (operation === "add") {
    date.setDate(date.getDate() + days);
  } else {
    date.setDate(date.getDate() - days);
  }

  // Retornar en formato YYYY-MM-DD
  return date.toISOString().split("T")[0];
};

/**
 * Convierte una fecha en string YYYY-MM-DD a UTC.
 * @param dateString YYYY-MM-DD
 * @returns Fecha en formato UTC
 */
export const convertDateToUTC = (dateString: string): string => {
  return new Date(dateString + "T00:00:00Z").toISOString();
};
