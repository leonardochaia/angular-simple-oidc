import { SimpleOidcError } from 'angular-simple-oidc/core';

export class TokenEndpointUnexpectedError extends SimpleOidcError {
    constructor(context: any) {
        super(
            `Token endpoint returned unexpected error`,
            `token-endpoint-unexpected-error`,
            context
        );
    }
}

export class TokenEndpointError extends SimpleOidcError {
    constructor(error: string, context: any) {
        super(
            `Token endpoint returned error: ${error}`,
            `token-endpoint-${error}`,
            context
        );
        // TODO: Use errors from https://tools.ietf.org/html/rfc6749#section-5.2
    }
}

export class AuthenticationConfigurationMissingError extends SimpleOidcError {
    constructor() {
        super(
            `Expected AUTH_CONFIG to be in Injector.` +
            `\nYou need to provide a configuration either with AngularSimpleOidc.forRoot() ` +
            `or by adding your own (Observable<AuthConfig> | AuthConfig) ` +
            `into the injector with the AUTH_CONFIG injection token.`,
            `auth-config-missing`,
            null
        );
    }
}