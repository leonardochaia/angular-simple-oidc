export interface DecodedIdentityToken {
    iss: string;
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
    IdentityToken = 'simple.oidc.identity-token',
    AccessToken = 'simple.oidc.access-token',
    AccessTokenExpiration = 'simple.oidc.access-token-expiration',
    PreRedirectUrl = 'simple.oidc.pre-redirect-url',
}

export interface LocalState {
    nonce: string;
    state: string;
    codeVerifier: string;
    authorizationCode: string;
    identityToken: string;
    accessToken: string;
    accessTokenExpiration: number;
    preRedirectUrl: string;
}
