import { z } from 'zod';

export type JsonActionSchema = {
	description: string;
	name: string;
	strict: boolean;
	parameters: Record<string, any>;
};
export const zodJsonActionSchema = z.object({
	description: z.string().min(1, 'Action schema description is required'),
	name: z.string().min(1, 'Action schema name is required'),
	strict: z.boolean(),
	parameters: z.object({
		type: z.literal('object'),
		properties: z.record(
			z.object({
				type: z.string(),
				description: z.string().optional(),
				required: z.boolean().optional(),
			}),
		),
		required: z.array(z.string()).optional(),
	}),
});

export type JsonActionConfiguration = Record<string, { id: number; value: any }>;
export const zodJsonConfigurationSchema = z.record(
	z.string(),
	z.object({
		id: z.any(),
		value: z.any(),
	}),
);

export type JsonActionResultsMetadata = Record<any, any>;

// Aqui se aregarian más valores según el tipo de proveedor ej: Twilio tiene los siguientes valores:
export type JsonConnectionsMetadata = {};
