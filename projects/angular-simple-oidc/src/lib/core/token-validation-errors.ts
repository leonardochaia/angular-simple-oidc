import { SimpleOidcError } from './errors';

export abstract class TokenValidationError extends SimpleOidcError { }

export class IdentityTokenMalformedError extends TokenValidationError {
    constructor(context: any) {
        super(
            'Identity token format invalid: it needs to have three dots. (header.payload.signature)',
            'id-token-invalid-format',
            context
        );
    }
}

export class InvalidStateError extends SimpleOidcError {
    constructor(context: any) {
        super(
            'Invalid state: State returned by IDP does not match local stored state.' +
            'Are you performing multiple authorize calls at the same time?',
            'invalid-state',
            context
        );
    }
}

export class AuthorizationCallbackFormatError extends SimpleOidcError {
    constructor(context: any) {
        super(
            `IDP redirected with invalid URL`,
            `authorize-callback-format`,
            context
        );
    }
}

export class AuthorizationCallbackMissingParameterError extends SimpleOidcError {
    constructor(param: string, context: any) {
        super(
            `IDP redirected with invalid/missing parameters on the URL: ${param}`,
            `authorize-callback-missing-${param}`,
            context
        );
    }
}

export class AuthorizationCallbackError extends SimpleOidcError {
    constructor(error: string, context: any) {
        super(
            `IDP returned an error after authorization redirection: ${error}`,
            `authorize-callback-error`,
            context
        );
    }
}
