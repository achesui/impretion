import { ServiceResponse } from '../../global';
import { UserData } from '../types';
import { auth0AccessTokenHandler } from './access-token-handler';

const TENANT_DOMAIN = 'dev-xw3cts5yn7mqyar7.us.auth0.com';

type CreatedOrganizationResponse = {
	id: string;
	display_name: string;
	name: string;
};

type Auth0Params<T> = {
	env: Env;
	data: T;
	userData: UserData;
};

export async function createOrganization(
	props: Auth0Params<{ displayName: string }>
): Promise<ServiceResponse<CreatedOrganizationResponse, string>> {
	try {
		const { data, env } = props;
		const { displayName } = data;
		const auth0AccessToken = await auth0AccessTokenHandler(env);

		const organizationDisplayName = displayName;

		// Normalización correcta para Auth0
		const organizationName = displayName
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.trim()
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '')
			.substring(0, 50);

		const response = await fetch(`https://${TENANT_DOMAIN}/api/v2/organizations`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${auth0AccessToken}`,
				Accept: 'application/json',
			},
			body: JSON.stringify({
				name: organizationName,
				display_name: organizationDisplayName,
			}),
		});

		if (response.status !== 201) throw new Error();

		const createdOrganization = await response.json<CreatedOrganizationResponse>();

		return { success: true, data: createdOrganization };
	} catch (error) {
		console.error('Error en la creación de la organización: ', error);
		return { success: false, error: 'Ha ocurrido un error en la creación de la organización' };
	}
}

export async function deleteOrganization(env: Env, data: {}, userData: UserData): Promise<ServiceResponse<{}, string>> {
	const { organizationId } = userData;
	const auth0AccessToken = await auth0AccessTokenHandler(env);
	const response = await fetch(`https://${TENANT_DOMAIN}/api/v2/organizations/${organizationId}`, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${auth0AccessToken}`,
		},
	});

	if (response.status !== 204) throw new Error();

	return { success: true, data: {} };
}

export async function addMemberToOrganization(props: Auth0Params<{}>): Promise<ServiceResponse<{}, string>> {
	try {
		const { env, userData } = props;
		const { organizationId, userId } = userData;
		const auth0AccessToken = await auth0AccessTokenHandler(env);

		console.log('id de usuario =?> ', userId);
		const response = await fetch(`https://${TENANT_DOMAIN}/api/v2/organizations/${organizationId}/members`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${auth0AccessToken}`,
			},
			body: JSON.stringify({
				members: [userId],
			}),
		});

		if (response.status !== 204) throw new Error();

		return { success: true, data: {} };
	} catch (error) {
		return { success: false, error: 'No se pudo agregar el miembro a la organización' };
	}
}

export async function assignRoleToMember(props: Auth0Params<{}>) {
	try {
		const { env, userData } = props;
		const { organizationId, userId } = userData;
		const auth0AccessToken = await auth0AccessTokenHandler(env);
		const response = await fetch(`https://${TENANT_DOMAIN}/api/v2/organizations/${organizationId}/members/${userId}/roles`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${auth0AccessToken}`,
			},
			body: JSON.stringify({
				roles: ['rol_jLH39DcRNfJLo186'], // Rol de 'admin' con permisos 'admin:all'
			}),
		});

		if (response.status !== 204) throw new Error();

		return { success: true, data: {} };
	} catch (error) {
		console.error('Error asignando rol al usuario en la creación de la organización.');
		return { success: false, error: 'No se pudo asignar el rol al usuario' };
	}
}

export async function getAuth0User<T>(
	props: Auth0Params<{ fields?: string; include_fields?: boolean }>
): Promise<ServiceResponse<T, string>> {
	try {
		const { env, userData, data } = props;
		const { fields, include_fields } = data;
		const { userId } = userData;

		console.log('ID DEL USUARIO --------------> ', userId);
		const auth0AccessToken = await auth0AccessTokenHandler(env);
		const params = new URLSearchParams();
		if (fields) {
			params.append('fields', fields);
			if (include_fields !== undefined) {
				params.append('include_fields', String(include_fields));
			}
		}
		const queryString = params.toString();

		console.log('LA QUERY STRING -----------> ', queryString);
		const response = await fetch(`https://${TENANT_DOMAIN}/api/v2/users/${userId}?${queryString ? queryString : ''}`, {
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${auth0AccessToken}`,
			},
		});

		console.log('respuesta auth0 => ', response);

		if (response.status !== 200) throw new Error();

		const auth0UserData = await response.json<T>();

		return { success: true, data: auth0UserData };
	} catch (error) {
		return { success: false, error: 'no se pudieron obtener los datos del usuario.' };
	}
}

export async function updateAuth0User(
	props: Auth0Params<{
		blocked?: boolean;
		email_verified?: boolean;
		email?: string;
		phone_number?: string;
		phone_verified?: boolean;
		user_metadata?: {};
		app_metadata?: {};
		given_name?: string;
		family_name?: string;
		name?: string;
		nickname?: string;
		picture?: string;
		verify_email?: false;
		verify_phone_number?: false;
		password?: string;
		connection?: string;
		client_id?: string;
		username?: string;
	}>
): Promise<ServiceResponse<Record<string, any>, string>> {
	try {
		const { userData, env, data } = props;
		const { userId } = userData;
		const auth0AccessToken = await auth0AccessTokenHandler(env);
		const response = await fetch(`https://${TENANT_DOMAIN}/api/v2/users/${userId}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${auth0AccessToken}`,
			},
			body: JSON.stringify(data),
		});

		if (response.status !== 204) throw new Error();

		const updatedUserData = await response.json<Record<string, any>>();

		return { success: true, data: updatedUserData };
	} catch (error) {
		return { success: false, error: 'Ha ocurrido un error actualizando el usuario.' };
	}
}
