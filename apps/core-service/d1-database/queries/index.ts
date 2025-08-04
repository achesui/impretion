import { LogQueryProps } from './logs/logs.d.types';

export type D1DatabaseQueryProps = { type: 'logs'; userData: UserData; query: LogQueryProps };

export type UserData = {
	organizationId: string;
	userId?: string;
};

// Para las operaciones de UPDATE/DELETE, D1 devuelve este objeto.
export type D1MutationResponse = {
	success: boolean;
	changes: number;
	lastRowId: number | null;
};
