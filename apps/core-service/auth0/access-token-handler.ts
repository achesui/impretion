export async function auth0AccessTokenHandler(env: Env): Promise<string | undefined> {
	try {
		const auth0TokenData = await env.INTEGRATIONS_GATEWAY.getTokens(
			{
				service: 'impretionAuth0ManagementAPI',
				data: {},
			},
			'generate'
		);

		if (!auth0TokenData.success) {
			throw new Error();
		}

		const { data: accessToken } = auth0TokenData;
		return accessToken;
	} catch (error) {
		console.error('No se pudo obtener el token de acceso de auth0');
		return undefined;
	}
}
