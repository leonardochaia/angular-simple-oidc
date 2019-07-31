
export const AuthConfigRequiredFields: (keyof AuthConfig)[] = ["clientId", "scope", "openIDProviderUrl"];

export interface AuthConfig {
    /** The URL to the OpenID Provider (OP).
     * Casing and ending slashes do not matter.
     * i.e: http://localhost/identity */
    openIDProviderUrl: string;

    /** The OIDC Client Id.
     * i.e: 'sample.client'. */
    clientId: string;

    /** The OIDC Client Secret (May be required for Code Flow).
     * Note that this is not really a secret so this value should
     * not be treated as one.
     * i.e: 'my.dummy.secret'. */
    clientSecret?: string;

    /** Space separated list of scopes to request when requesting access tokens.
     * i.e: 'openid profile'
     */
    scope: string;

    /**
     * Name of the tokenCallbackPath. This is the Angular Route 'path'
     * that will be set as implicit flow redirect uri.
     */
    tokenCallbackRoute?: string;

    /**
     * Storage for storing tokens, state challenges,
     */
    storage?: Storage;

    /** DANGER ZONE:
     * Allows to tweak token validation behaviour
     * WARNING: This may deviate from the OIDC spec.
     */
    tokenValidation?: {
        /**
         * Disable token IAT validation.
         * Prevents timezone errors
         */
        disableIdTokenIATValidation?: boolean;

        /**
         * Offset allowed if IAT is enabled
         * in seconds
         */
        idTokenIATOffsetAllowed?: number;
    }

    /**
     * Relative from @openIDProviderUrl
     * The URL of the discovery document.
     */
    discoveryDocumentUrl?: string;
}
