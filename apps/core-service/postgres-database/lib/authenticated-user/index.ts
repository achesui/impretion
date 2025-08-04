import { JWK } from 'jose';
import { createNeonJWT } from './jwt';

export async function authenticatedUser({
	organizationId,
	identifier,
	env,
}: {
	identifier: string;
	organizationId: string;
	env: Env;
}): Promise<string> {
	const privateKey = env.JWK_PRIVATE_KEY;
	const privateKeyJwk: JWK = await JSON.parse(privateKey);

	return await createNeonJWT({
		organizationId,
		privateKeyJwk,
		userId: identifier, // Podemos usar el connectedWith como id de usuario.
	});
}
