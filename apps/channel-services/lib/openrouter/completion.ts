import { Context } from 'hono';
import { OpenRouterResponse, OpenRouterRequest, Message, Tool } from './openrouter.types'; // Importa todos los tipos necesarios

export const openRouterConnection = async (
	c: Context,
	messages: Message[],
	models: string[],
	responseFormat: { type: 'json_schema'; json_schema: Record<string, any> } | { type: 'json_object' } | undefined = undefined,
	tools?: Tool[],
	stream: boolean = false
): Promise<OpenRouterResponse> => {
	const requestBody: OpenRouterRequest = {
		messages,
		models,
		response_format: responseFormat,
		tools,
		stream,
	};

	const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${c.env.OPENROUTER_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(requestBody),
	});

	if (!response.ok) {
		// Manejar errores de forma más específica
		const errorData = await response.json();
		console.error('Error en la respuesta de OpenRouter:', errorData);
		throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
	}

	const data: OpenRouterResponse = await response.json();

	return data;
};
