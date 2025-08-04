type ModelPricing = {
	input: number; // Precio en USD por 1M de tokens de entrada
	output: number; // Precio en USD por 1M de tokens de salida
};

// Mapeo de precios de modelos.
export const modelPricingSheet: Record<string, ModelPricing> = {
	'openai/gpt-4.1': { input: 2.0, output: 8.0 },
	'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
	'qwen/qwen3-235b-a22b-2507:free': { input: 0.15, output: 0.6 },
};

/**
 * Márgenes de ganancia en USD.
 * isInternal: true => El proceso es interno, llamadas agenticas, procesos complejos que requieran IA etc...
 * isInternal: false => Proceso común, interacción entre un usuario y una IA.
 */
const MARGIN_INTERNAL_USD = 0.005;
const MARGIN_EXTERNAL_USD = 0.01;
const TWILIO_COST = 0.005;

// Multiplicador para la contabilidad interna.
const USD_TO_UNITS_MULTIPLIER = 1_000_000;
const TOKENS_MULTIPLIER = 1_000_000;

type CostInput = {
	modelId: string;
	promptTokens: number;
	completionTokens: number;
	isInternal: boolean;
	source: string;
};

/**
 * Calcula el costo final total en unidades enteras, basándose en los parámetros proporcionados.
 * Esta función es la única que necesitas.
 *
 * @param {CostInput} props - Los datos de la interacción ya extraídos.
 * @returns {number} El costo final como un NÚMERO ENTERO listo para la base de datos.
 */
export function calculateCost(props: CostInput): number {
	const { modelId, promptTokens, completionTokens, isInternal } = props;

	// --- PASO A: CALCULAR EL COSTO BASE DE LA IA (EN USD) ---
	const pricing = modelPricingSheet[modelId];
	let baseIaCostInUSD = 0;

	if (pricing) {
		const inputCost = (promptTokens / TOKENS_MULTIPLIER) * pricing.input;
		const outputCost = (completionTokens / TOKENS_MULTIPLIER) * pricing.output;
		baseIaCostInUSD = inputCost + outputCost;
	} else {
		console.warn(`[calculateCost] No se encontraron precios para el modelo: ${modelId}. Costo base será 0.`);
	}

	// --- PASO B: DETERMINAR EL MARGEN DE GANANCIA (EN USD) ---
	// Si es externo se agrega el costo de Twilio. En el futuro habran más origenes de mensajes fuera de Twilio, se quitara el costo de Twilio.
	const revenueMarginUSD = isInternal ? MARGIN_INTERNAL_USD : MARGIN_EXTERNAL_USD + TWILIO_COST + TWILIO_COST; // Se cobran ambos mensajes (input/output de twilio)

	// --- PASO C: CALCULAR EL COSTO TOTAL (EN USD) ---
	const finalCostInUSD = baseIaCostInUSD + revenueMarginUSD;

	// --- PASO D: CONVERTIR A UNIDADES ENTERAS Y DEVOLVER ---
	return Math.round(finalCostInUSD * USD_TO_UNITS_MULTIPLIER);
}
