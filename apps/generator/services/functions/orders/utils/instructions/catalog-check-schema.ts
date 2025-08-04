export const catalogCheckSchema = {
  name: "product_request",
  strict: true,
  schema: {
    type: "object",
    required: [
      "productPrices",
      "isProcessable",
      "rejectedProducts",
      "orderDetails",
    ],
    properties: {
      orderDetails: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "extras", "modificables", "customPreferences"],
          properties: {
            name: {
              type: "string",
              description: "Nombre del producto o combo.",
            },
            extras: {
              type: "array",
              items: {
                type: "object",
                required: ["name", "quantity"],
                properties: {
                  name: {
                    type: "string",
                    description: "Nombre de la adición extra.",
                  },
                  quantity: {
                    type: "number",
                    description: "Cantidad de la adición extra.",
                  },
                },
                additionalProperties: false,
              },
              description:
                "Lista de adiciones extra solicitadas para este producto o combo.",
            },
            modificables: {
              type: "array",
              items: {
                type: "object",
                required: ["substitute", "replacedBy", "quantity"],
                properties: {
                  quantity: {
                    type: "number",
                    description: "Cantidad que puede ser sustituida.",
                  },
                  replacedBy: {
                    type: "string",
                    description: "Producto por el cual se va a reemplazar.",
                  },
                  substitute: {
                    type: "string",
                    description: "Producto que se va a sustituir.",
                  },
                },
                additionalProperties: false,
              },
              description:
                "Opciones de modificación disponibles para este producto o combo.",
            },
            customPreferences: {
              type: "string",
              description:
                "Preferencias personalizadas del usuario para este producto o combo (ej. 'mucha salsa', 'sin cebolla', 'bien cocido').",
            },
          },
          additionalProperties: false,
        },
        description:
          "Detalles de la orden, incluyendo cada producto o combo y sus adiciones extra.",
      },
      isProcessable: {
        type: "boolean",
        description:
          "Indica si todos los productos solicitados existen en el catálogo y pueden ser procesados. Si hay al menos un producto en 'rejectedProducts', este valor SIEMPRE debe ser 'false'.",
      },
      productPrices: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "price", "quantity"],
          properties: {
            name: {
              type: "string",
              description: "Nombre del producto o combo.",
            },
            price: {
              type: "number",
              description:
                "Precio unitario del producto o combo en pesos colombianos.",
            },
            quantity: {
              type: "number",
              description:
                "Cantidad total de este producto o combo ordenada por el usuario.",
            },
          },
          additionalProperties: false,
        },
        description:
          "Lista de productos disponibles en el catálogo con sus precios unitarios en pesos colombianos y la cantidad total ordenada por el usuario.",
      },
      rejectedProducts: {
        type: "array",
        items: {
          type: "string",
          description: "Nombre del producto rechazado.",
        },
        description:
          "Lista de productos solicitados que no existen en el catálogo. Si un producto está en esta lista, NO debe ser agregado a 'orderDetails' ni a 'productPrices', ya que no tiene sentido incluir un producto que no existe.",
      },
    },
    additionalProperties: false,
  },
};
