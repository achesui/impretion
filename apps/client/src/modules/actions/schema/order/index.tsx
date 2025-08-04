export const order = {
  renderer: {
    // Mapea las definiciones necesarias para la descripcion de esta accion, (por mejorar)
    metadata: {
      // Definiciones necesarias para la llamada a la función (en ingles)
      functionCalling: {
        name: "orders",
        description:
          "Manages user orders, allowing creation, modification, cancellation, or querying details of an order. According to the value of 'actionType', the following strict rules apply: 'create': All required order fields must be queried except 'code' and 'actionType'. 'update': Modifies an existing order; only include the fields to be updated along with the 'code'. 'cancel': First, the 'code' is requested and then an explicit confirmation is required to proceed with the cancellation. 'read': Retrieves detailed information about an existing order. 'catalog': Returns information about the menu or product catalog, including specific product details, the complete list, or prices, allowing the user to be informed prior to placing an order.",
        parameters: {
          name: {
            type: "string",
            description:
              "Name of the customer placing the order. Required for order creation.",
          },
          address: {
            type: "string",
            description:
              "Delivery address for the order. Required for order creation.",
          },
          phone: {
            type: "string",
            description:
              "Contact phone number of the customer. Required for order creation.",
          },
          order: {
            type: "string",
            description:
              "For 'create': Always required, it contains the order details such as items and quantities (e.g., '2 widgets, 1 gadget'). For 'catalog': The query the user wishes to make regarding products.",
          },
        },
        extraParameters: {
          code: {
            type: "string",
            description:
              "Unique order code previously provided to the user. Required to modify, cancel, or view order details.",
          },
          actionType: {
            type: "string",
            description:
              "Action the user wants to perform. 'create': Create a new order (all fields are required and must be explicitly requested from the user, except 'code' and 'actionType'). 'update': Update an existing order (only the fields to be updated along with the 'code' are provided). 'cancel': Cancel an order (requires the 'code' and an explicit confirmation). 'read': Query details of an existing order. 'catalog': Provide information about the product catalog or menu, including specific details or the complete list, so that the user can be informed before placing an order.",
            enum: ["create", "update", "cancel", "read", "catalog"],
          },
        },
      },
      // Definiciones y explicaciones en español para la descripcion final de la accion
      definitions: {
        type: "Gestión de ordenes",
        description:
          "Este asistente puede gestionar ordenes teniendo en cuenta tú configuración y horarios.",
        route: "ordenes",
        newActionButton: "Crear nueva acción de gestión de ordenes",
      },
    },
    filters: {},
    configuration: {
      inventory: {
        label: "Inventario",
        description: "Inventario disponible para la venta.",
        component: "Inventory",
        optional: false,
        defaultValues: {
          id: 1,
          value: {
            products: "",
          },
        },
      },
      QRPayments: {
        label: "Pagos con QR",
        description: "Formato de pago de las ordenes.",
        component: "QRPayment",
        optional: false,
        defaultValues: {
          id: 2,
          value: {
            isEnabled: false,
            configuration: {
              documentType: "",
              documentNumber: "",
              merchantId: "",
              accountHolderName: "",
              accountNumber: "",
            },
          },
        },
      },
      schedule: {
        label: "Días y horarios de labor",
        description: "Dias y horarios en los que el negocio abre.",
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
      deliveriesLocations: {
        label: "Localizaciones",
        description: "Localizaciones disponibles para la entrega.",
        component: "DeliveriesLocations",
        optional: true,
        examples: [
          "Una clinica la cual maneja diferentes consultorios cada uno asignado a su propio doctor con horarios flexibles.",
          "Un cadena de resturantes con diferentes ubicaciones y horarios rotativos para cada empleado en cada uno de ellos.",
        ],
        defaultValues: {
          id: 4,
          value: [],
        },
      },
    },
    parameters: {
      name: {
        label: "Nombre del cliente",
        description:
          "El asistente pedirá al usuario la fecha en que se programará la cita.",
        optional: false,
      },
      address: {
        label: "Dirección del cliente",
        description:
          "El asistente pedirá al usuario la dirección en que se programará la cita.",
        optional: false,
      },
      phone: {
        label: "Teléfono del cliente",
        description: "El asistente pedirá al usuario el teléfono del cliente.",
        optional: false,
      },
      order: {
        label: "Detalles de la orden",
        description: "La toma de la orden del usuario.",
        optional: false,
      },
    },
  },
  defaultContext: {
    configuration: [
      "inventory",
      "QRPayments",
      "deliveriesLocations",
      "schedule",
    ],
    parameters: ["name", "address", "phone", "order"],
  },
  status: {
    adjustableResults: ["completed", "pending"],
    fixedResults: ["canceled"],
  },
  actionConfiguration: {
    usage: {
      commercial: 30,
    },
  },
  returns: {
    value: true,
    description:
      "El asistente agendará las citas de tus clientes, y se notificarán por WhatsApp si tienes activada la recepción de estos mensajes en tu teléfono o en la pestaña 'general' de la consola.",
  },
};
