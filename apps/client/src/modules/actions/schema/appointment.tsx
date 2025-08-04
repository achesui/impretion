import { format } from "date-fns";
import { BookText } from "lucide-react";
export const appointment = {
  renderer: {
    // Mapea las definiciones necesarias para la descripcion de esta accion, (por mejorar)
    metadata: {
      // Definiciones necesarias para la llamada a la función (en ingles)
      functionCalling: {
        name: "appointments",
        description:
          "Manages user appointments, allowing creation, modification, cancellation, availability checks, or retrieving details. According to the value of actionType follow these rules strictly: 'create': All required data must be provided except 'code'. 'availability': Request only the date. Include time only if the user explicitly mentions it. 'details': Requires 'code'. 'update': Modifies an existing appointment. Provide ONLY the fields you intend to update. 'code' and 'actionType' are always required. Leave all other fields empty. Example: To update the appointment time, include 'code', 'actionType', and the new 'time', all other fields as empty strings or null: {'actionType':'update', 'code':'123456', 'time':'15:00', name: '', email: ''}. 'cancel': First, request 'code', then explicitly confirm if the user wants to cancel before executing this function.",
        parameters: {
          date: {
            type: "string",
            description:
              "Appointment date in YYYY-MM-DD format. If the user provides the date in natural language (e.g., '19 july', 'tomorrow', 'next friday'), you must automatically transform it to YYYY-MM-DD format. NEVER ask the user to provide the date in a specific format - always convert it yourself",
          },
          time: {
            type: "string",
            description:
              "Appointment time in HH:MM format. Do not ask for it in this specific format, just request the time naturally.",
          },
          name: {
            type: "string",
            description:
              "Name of the client scheduling or managing the appointment. Do not modify or assume names.",
          },
          email: {
            type: "string",
            description: "Client's contact email. Required for any action.",
          },
          phone: {
            type: "string",
            description: "Client's phone number. Required for any action.",
          },
        },
        extraParameters: {
          code: {
            type: "string",
            description:
              "Unique appointment code previously provided to the user. Required to modify, cancel, or view appointment details.",
          },
          actionType: {
            type: "string",
            description:
              "Action the user wants to perform. 'create': create an order, all the fields are required. 'update': Modify an specific order. Only the data to be updated must be provided. 'cancel': cancel an order (ALWAYS requires confirmation). 'details': retrieve information about an order.",
            enum: ["create", "update", "availability", "cancel", "details"],
          },
        },
      },
      // Definiciones y explicaciones en español para la descripcion final de la accion
      definitions: {
        type: "Agendamiento de citas",
        description:
          "Esta función te permite agendar citas fácilmente y sincronizarlas con tus calendarios actuales.",
        route: "agendamiento_de_cita",
        newActionButton: "Agendamiento de citas",
        icon: <BookText color="#425466" size={30} />,
      },
    },
    filters: {},
    configuration: {
      timeZone: {
        label: "Zona horaria",
        description: "Zona horaria actual del usuario.",
        component: "TimeZone",
        optional: false,
        defaultValues: {
          id: 1,
          value: "America/Bogotá",
        },
      },
      startDate: {
        label: "Fecha de inicio de citas",
        description: "Día a partir del cual se comienzan a aceptar citas.",
        component: "StartDate",
        optional: false,
        defaultValues: {
          id: 2,
          value: format(new Date(), "yyyy-MM-dd"),
        },
      },
      schedule: {
        label: "Días y horas disponibles para agendar",
        description: "Dias y horas para recibir clientes.",
        component: "Schedule",
        optional: false,
        defaultValues: {
          id: 3,
          value: {
            sunday: {
              isEnabled: false,
              startTime: "08:00",
              endTime: "18:00",
            },
            monday: {
              isEnabled: true,
              startTime: "08:00",
              endTime: "18:00",
            },
            tuesday: {
              isEnabled: true,
              startTime: "08:00",
              endTime: "18:00",
            },
            wednesday: {
              isEnabled: true,
              startTime: "08:00",
              endTime: "18:00",
            },
            thursday: {
              isEnabled: true,
              startTime: "08:00",
              endTime: "18:00",
            },
            friday: {
              isEnabled: true,
              startTime: "06:00",
              endTime: "18:00",
            },
            saturday: {
              isEnabled: false,
              startTime: "08:00",
              endTime: "18:00",
            },
          },
        },
      },
      maxAppointmentsPerDay: {
        label: "Citas máximas por día",
        description: "Cantidad máxima de citas que se pueden agendar por día.",
        component: "MaxAppointmentsPerDay",
        optional: false,
        defaultValues: {
          id: 4,
          value: {
            isAuto: false,
            value: 3,
          },
        },
      },
      slotInterval: {
        label: "Intervalo entre citas",
        description: "Duración en minutos entre citas consecutivas.",
        component: "SlotInterval",
        optional: false,
        defaultValues: {
          id: 5,
          value: 10,
        },
      },
      integrations: {
        label: "Integraciones",
        description: "Selecciona las integraciones que deseas utilizar.",
        component: "Integrations",
        optional: false,
        defaultValues: {
          id: 6,
          value: [],
        },
      },
    },
    parameters: {
      date: {
        label: "Fecha de la cita",
        description:
          "El asistente pedirá al usuario la fecha en que se programará la cita.",
        optional: false,
      },
      time: {
        label: "Hora de la cita",
        description:
          "El asistente pedirá al usuario la hora en que se realizará la cita.",
        optional: false,
      },
      name: {
        label: "Nombre del cliente",
        description:
          "El asistente solicitará al usuario el nombre de la persona que está reservando la cita.",
        optional: false,
      },
      phone: {
        label: "Teléfono de contacto",
        description:
          "El asistente pedirá al usuario un número de teléfono para contacto.",
        optional: false,
      },
      email: {
        label: "Correo electrónico",
        description:
          "El asistente solicitará la dirección de correo electrónico del cliente para contacto.",
        optional: false,
      },
      location: {
        label: "Ubicación",
        description:
          "El asistente solicitará la ubicación al asistente como punto de encuentro.",
        optional: true,
      },
    },
  },
  defaultContext: {
    configuration: [
      "timeZone",
      "startDate",
      "schedule",
      "maxAppointmentsPerDay",
      "slotInterval",
      "integrations",
    ],
    parameters: ["date", "time", "name", "email", "phone"],
  },
  actionConfiguration: {
    usage: {
      commercial: 30,
    },
  },
};
