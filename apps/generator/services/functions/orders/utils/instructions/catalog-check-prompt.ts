export const catalogCheckPrompt = (catalog: string): string => `
A continuación se te proporcionará el catálogo de productos disponibles. Debes procesar la solicitud del usuario siguiendo estas reglas de forma extremadamente estricta:

1. Para cada producto solicitado:
   - Incluye su nombre y precio individual exacto (según el catálogo) en 'productPrices'.
   - Si el usuario especifica una cantidad, regístrala; si no, asume 1.

2. Asegúrate de que los precios sean exactos según el catálogo y no hagas suposiciones ni ajustes. Si un producto tiene opciones (ej. Combos con sustituciones), usa el precio base del combo a menos que el usuario especifique algo diferente que no esté en el catálogo.

3. Si un producto tiene la etiqueta modificable, sigue estrictamente las propiedades que se pueden cambiar de ese producto junto con su cantidad.

## Catálogo:

${catalog}
`;
