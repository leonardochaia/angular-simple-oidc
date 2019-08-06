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
