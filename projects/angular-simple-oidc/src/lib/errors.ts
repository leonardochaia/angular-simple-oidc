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
