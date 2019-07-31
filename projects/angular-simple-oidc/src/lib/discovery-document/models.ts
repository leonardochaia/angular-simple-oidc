
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
