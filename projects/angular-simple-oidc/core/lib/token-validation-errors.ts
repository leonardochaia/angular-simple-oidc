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

export class JWTKeysMissingError extends TokenValidationError {
    constructor(context: any) {
        super(
            'Provided JWT Keys are empty or invalid',
            'jwt-keys-empty',
            context
        );
    }
}

export class JWTKeysInvalidError extends TokenValidationError {
    constructor(context: any) {
        super(
            'Failed to find a valid key from provided JWT Keys. No key with kty=RSA and use=sig found.',
            'jwt-keys-invalid',
            context
        );
    }
}

export class InvalidSignatureError extends TokenValidationError {
    constructor(context: any) {
        super(
            'Failed to validate signature against any of the JWT keys',
            'invalid-signature',
            context
        );
    }
}

export class SignatureAlgorithmNotSupportedError extends TokenValidationError {
    constructor(context: any) {
        super(
            'Only "RS256" alg is currently supported',
            'signature-alg-not-supported',
            context
        );
    }
}

export class ClaimRequiredError extends TokenValidationError {
    constructor(claim: string, context: any) {
        super(
            `Required claim ${claim} is missing`,
            `missing-claim`,
            context
        );
    }
}

export class ClaimTypeInvalidError extends TokenValidationError {
    constructor(claim: string, expectedType: string, actualType: string, context: any) {
        super(
            `Claim ${claim} is expected to be ${expectedType} got ${actualType} instead.`,
            `invalid-claim-type`,
            context
        );
    }
}

export class DateClaimInvalidError extends TokenValidationError {
    constructor(claim: string, context: any) {
        super(
            `Failed to parse claim ${claim} value into a Date object.`,
            `invalid-date-claim`,
            context
        );
    }
}

export class IssuedAtValidationFailedError extends TokenValidationError {
    constructor(offset: number, context: any) {
        super(
            `Issued at (iat claim) validation failed. Token was expected to have been issued between ${offset} seconds offset`,
            `iat-validation-failed`,
            context
        );
    }
}

export class IssuerValidationFailedError extends TokenValidationError {
    constructor(identityTokenIssuer: string, discoveryIssuer: string, context: any) {
        super(
            // tslint:disable-next-line: max-line-length
            `Issuer (iss) validation failed. Identity Token's iss (${identityTokenIssuer}) does not match discovery document's issuer (${discoveryIssuer})`,
            `iss-validation-failed`,
            context
        );
    }
}

export class AudienceValidationFailedError extends TokenValidationError {
    constructor(identityTokenAud: string, clientId: string, context: any) {
        super(
            // tslint:disable-next-line: max-line-length
            `Audience (aud) validation failed. Identity Token's aud (${identityTokenAud}) does not include this client's ID (${clientId}). The token may not intended for this client.`,
            `aud-validation-failed`,
            context
        );
    }
}

export class TokenExpiredError extends TokenValidationError {
    constructor(expiration: Date, context: any) {
        super(
            `The token has already expired at ${expiration}`,
            `token-expired`,
            context
        );
    }
}

export class AccessTokenHashValidationFailedError extends TokenValidationError {
    constructor(context: any) {
        super(
            `Access Token Hash (at_hash) validation has failed. at_hash does not match hash of access token`,
            `access-token-validation-failed`,
            context
        );
    }
}

export class InvalidStateError extends SimpleOidcError {
    constructor(context: any) {
        super(
            'State returned by IDP does not match local stored state.' +
            'Are you performing multiple authorize calls at the same time?',
            'invalid-state',
            context
        );
    }
}

export class InvalidNonceError extends TokenValidationError {
    constructor(context: any) {
        super(
            'Nonce returned by IDP does not match local stored nonce.' +
            'Are you performing multiple authorize calls at the same time?',
            'invalid-nonce',
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
