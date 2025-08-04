import { z } from "zod";
import { ServiceResponse } from "../../../../../global";
import {
  AppointmentsArgs,
  TransformedAppointmentArgs,
} from "../../../../src/types";

type FieldsToValidate = {
  date: string;
  time: { startTime: string; endTime: string };
  name: string;
  email: string;
  phone: string;
  location?: string;
  code: string;
};

export const fieldValidation = async (
  functionArguments: TransformedAppointmentArgs,
): Promise<ServiceResponse<FieldsToValidate, string>> => {
  // Limpiamos, eliminando argumentos no requeridos en la creación de la acción.
  const { code, actionType, ...requiredArguments } = functionArguments;

  // VALIDACIÓN DE CAMPOS
  const { isValid, errors } = await fieldCheck(requiredArguments);

  if (!isValid) {
    return {
      success: false,
      error: `Error de validación en los campos: ${errors}
Instrucción para el Asistente: 
"Por favor, solicita amablemente al usuario que verifique y reingrese el valor correcto para cada campo validado', 
asegurándote de mencionar específicamente los campo problematicos y su posible solución."`,
    };
  }

  const generatedCode = appointmentCodeGenerator();
  const appointmentData = {
    code: generatedCode,
    ...requiredArguments,
  };

  return {
    success: true,
    data: appointmentData,
  };
};

function appointmentCodeGenerator() {
  const min = 100000;
  const max = 999999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

const FORBIDDEN_TERMS = ["unknown", "unknow", "undefined", "null", "string"];

// Validación específica para formato de hora (HH:MM)
const timeFormatValidator = (val: string) =>
  /^([01]\d|2[0-3]):([0-5]\d)$/.test(val);

// Esquema principal con validaciones específicas actualizadas
const AppointmentSchema = z.object({
  date: z
    .string()
    .refine((val) => val.trim() !== "", {
      message: "El campo no puede ser una cadena vacía",
    })
    .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: "Formato fecha inválido (YYYY-MM-DD)",
    })
    .refine((val) => !FORBIDDEN_TERMS.includes(val.toLowerCase()), {
      message: `El campo contiene un término prohibido`,
    })
    .optional(),

  // ACTUALIZADO: time ahora es un objeto con startTime y endTime
  time: z
    .object({
      startTime: z
        .string()
        .refine((val) => val.trim() !== "", {
          message: "startTime no puede ser una cadena vacía",
        })
        .refine(timeFormatValidator, {
          message: "startTime debe tener formato HH:MM válido",
        })
        .refine((val) => !FORBIDDEN_TERMS.includes(val.toLowerCase()), {
          message: `startTime contiene un término prohibido`,
        }),

      endTime: z
        .string()
        .refine((val) => val.trim() !== "", {
          message: "endTime no puede ser una cadena vacía",
        })
        .refine(timeFormatValidator, {
          message: "endTime debe tener formato HH:MM válido",
        })
        .refine((val) => !FORBIDDEN_TERMS.includes(val.toLowerCase()), {
          message: `endTime contiene un término prohibido`,
        }),
    })
    .refine(
      (timeObj) => {
        // Validación adicional: startTime debe ser menor que endTime
        const [startHour, startMin] = timeObj.startTime.split(":").map(Number);
        const [endHour, endMin] = timeObj.endTime.split(":").map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        // Considera el caso donde endTime puede ser del día siguiente (ej: 23:30 - 01:30)
        if (endMinutes < startMinutes) {
          // Si endTime es menor, asumimos que es del día siguiente
          return endMinutes + 24 * 60 > startMinutes;
        }

        return endMinutes > startMinutes;
      },
      {
        message: "La hora de fin debe ser posterior a la hora de inicio",
      },
    )
    .optional(),

  name: z
    .string()
    .min(2, "Nombre debe tener mínimo 2 caracteres")
    .refine((val) => val.trim() !== "", {
      message: "El campo no puede ser una cadena vacía",
    })
    .refine((val) => !FORBIDDEN_TERMS.includes(val.toLowerCase()), {
      message: `El campo contiene un término prohibido`,
    })
    .optional(),

  email: z
    .string()
    .email("Correo electrónico inválido")
    .refine((val) => val.trim() !== "", {
      message: "El campo no puede ser una cadena vacía",
    })
    .refine((val) => !FORBIDDEN_TERMS.includes(val.toLowerCase()), {
      message: `El campo contiene un término prohibido`,
    })
    .optional(),

  phone: z
    .string()
    .min(3, "Teléfono debe tener mínimo 3 caracteres")
    .max(15, "Teléfono debe tener máximo 15 caracteres")
    .refine((val) => val.trim() !== "", {
      message: "El campo no puede ser una cadena vacía",
    })
    .refine((val) => !FORBIDDEN_TERMS.includes(val.toLowerCase()), {
      message: `El campo contiene un término prohibido`,
    })
    .optional(),

  location: z
    .string()
    .refine((val) => val.trim() !== "", {
      message: "El campo no puede ser una cadena vacía",
    })
    .refine((val) => !FORBIDDEN_TERMS.includes(val.toLowerCase()), {
      message: `El campo contiene un término prohibido`,
    })
    .optional(),
});

// Función de validación optimizada
export async function fieldCheck(fields: Record<string, unknown>) {
  const result = AppointmentSchema.safeParse(fields);

  if (!result.success) {
    const formattedErrors = result.error.issues.map(
      (issue: any) => `${issue.path.join(".")}: ${issue.message}`,
    );
    console.log("formattedErrors: ", formattedErrors);
    return {
      isValid: false,
      errors: formattedErrors,
    };
  }

  return { isValid: true, errors: [] };
}
