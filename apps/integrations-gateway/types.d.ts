/** GENERATE TOKENS **/

export type CalendlyTokenData = {
  code?: string;
  redirect_uri?: string;
  code_verifier?: string;
  refresh_token?: string;
};

export type ShopifyTokenData = {
  clientId: string;
  code: string;
  grantType: string;
  hmac: string;
  host: string;
  redirectUri: string;
  service: string;
  shop: string;
  shopUrl: string;
  state: string;
  timestamp: string;
};

/*
export type GoogleTokenData = {
  code: string;
  client_id: string;
  client_secret: string;
  grant_type: "authorization_code";
  redirect_uri: string;
};
 */

// Union type for all service data
export type ServiceTokenData = {
  calendly: CalendlyTokenData;
  shopify: ShopifyTokenData;
  impretionAuth0ManagementAPI: {};
  //google: GoogleTokenData;
  // Add more services here
};

// Generic params type with conditional data
export type GetTokensParams<
  T extends keyof ServiceTokenData = keyof ServiceTokenData,
> = {
  service: T;
  data: ServiceTokenData[T];
};

/** REVOKE TOKENS **/

// Revoke tokens params type
export type RevokeTokensParams = {
  service: keyof ServiceTokenData;
  accessToken: string;
  refreshToken?: string;
};

// OAuth Token Response types
export type CalendlyOAuthTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  created_at: number;
  owner: string;
  organization: string;
};

export type ShopifyOAuthTokenResponse = {};

// Auth0 Token Response Types
export type Auth0ManagementApiResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

export type Auth0CachedManagementApiResponse = {
  accessToken: string;
  expiresAt: Date;
};

/*
export type GoogleOAuthTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
};
 */

export type GetServiceType = "generate" | "regenerate";

// Handler function types
export type TokenHandler<T extends keyof ServiceTokenData> = (
  env: Env,
  data: ServiceTokenData[T],
  type: "generate" | "regenerate",
) => Promise<any>;

export type RevokeTokenHandler = (
  env: Env,
  accessToken: string,
  refreshToken: string,
) => Promise<void>;

export type GenerateTokensHandler = {
  [K in keyof ServiceTokenData]: TokenHandler<K>;
};

export type RevokeTokensHandler = {
  [K in keyof ServiceTokenData]: RevokeTokenHandler;
};
