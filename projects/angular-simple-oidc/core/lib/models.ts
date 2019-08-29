export interface DecodedIdentityToken {
    iss: string;
    azp?: string;
    aud: string | string[];
    exp: number;
    nbf: number;
    nonce: string;
    iat: number;
    at_hash: string;
    sid: string;
    sub: string;
    auth_time: number;
    idp: string;
    amr: string | string[];
    [claimType: string]: string | number | string[];
}

export interface IdentityTokenHeader {
    alg: string;
    kid: string;
}

export interface TokenRequestResult {
    accessToken?: string;
    accessTokenExpiresIn?: number;
    accessTokenExpiresAt?: number;
    idToken?: string;
    decodedIdToken?: DecodedIdentityToken;
    error?: string;
    refreshToken?: string;
}

export enum TokenStorageKeys {
    Nonce = 'simple.oidc.nonce',
    State = 'simple.oidc.state',
    CodeVerifier = 'simple.oidc.code-verifier',
    AuthorizationCode = 'simple.oidc.authorization-code',
    SessionState = 'simple.oidc.session-state',
    OriginalIdentityToken = 'simple.oidc.original-identity-token',
    IdentityToken = 'simple.oidc.identity-token',
    IdentityTokenDecoded = 'simple.oidc.identity-token-decoded',
    AccessToken = 'simple.oidc.access-token',
    RefreshToken = 'simple.oidc.refresh-token',
    AccessTokenExpiration = 'simple.oidc.access-token-expiration',
    PreRedirectUrl = 'simple.oidc.pre-redirect-url',
}

export interface LocalState {
    nonce: string;
    state: string;
    codeVerifier: string;
    authorizationCode: string;
    identityToken: string;
    originalIdentityToken: string;
    decodedIdentityToken: DecodedIdentityToken;
    accessToken: string;
    accessTokenExpiration: number;
    refreshToken: string;
    preRedirectUrl: string;
    sessionState?: string;
}

export interface TokenValidationConfig {
    /**
     * Disable token IAT validation.
     * Helps prevents timezone errors
     */
    disableIdTokenIATValidation?: boolean;

    /**
     * Offset allowed if IAT is enabled
     * in seconds
     */
    idTokenIATOffsetAllowed?: number;
}

export interface DiscoveryDocument {
    issuer: string;
    jwks_uri: string;
    authorization_endpoint: string;
    token_endpoint: string;
    userinfo_endpoint: string;
    end_session_endpoint: string;
    check_session_iframe: string;
    revocation_endpoint: string;
    introspection_endpoint: string;
    frontchannel_logout_supported: boolean;
    frontchannel_logout_session_supported: boolean;
    scopes_supported: string[];
    claims_supported: string[];
    response_types_supported: string[];
    response_modes_supported: string[];
    grant_types_supported: string[];
    subject_types_supported: string[];
    id_token_signing_alg_values_supported: string[];
    code_challenge_methods_supported: string[];
    token_endpoint_auth_methods_supported: string[];
    [key: string]: string | string[] | boolean;
}

export interface JWTKey {
    kty: string;
    use: string;
    kid: string;
    x5t?: string;
    e: string;
    n: string;
    x5c?: string[];
}

export interface JWTKeys {
    keys: JWTKey[];
}
