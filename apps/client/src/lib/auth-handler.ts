import { Auth0ContextInterface, User } from "@auth0/auth0-react";
import { UserData } from "@base/shared-types";

/**
 * Los namespaces evitan colisiones a la hora de intentar acceder a ciertos valores customizados en claims de auth0
 */
export const namespaces = {
  organizationId: "https://impretion.com/organization_id",
};

export async function authUserData(
  auth: Auth0ContextInterface<User>
): Promise<UserData> {
  const { user, getIdTokenClaims } = auth;

  const namespace = namespaces.organizationId;
  const organizationId =
    user?.[namespace] || (await getIdTokenClaims())?.[namespace];

  const userId = user?.sub;

  return { organizationId, userId };
}
