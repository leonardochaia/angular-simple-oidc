import { TokenValidationError } from '../token-validation-errors';


export class IssuerValidationError extends TokenValidationError {
    constructor(originalIssuer: string, newIssuer: string, context: any) {
        super(
            // tslint:disable-next-line: max-line-length
            `Issuer (iss) validation failed. Original Identity Token's iss (${originalIssuer}) does not match new token's issuer (${newIssuer})`,
            `iss-validation-failed-refresh`,
            context
        );
    }
}

export class SubjectValidationError extends TokenValidationError {
    constructor(originalSubject: string, newSubject: string, context: any) {
        super(
            // tslint:disable-next-line: max-line-length
            `Subject (sub) validation failed. Original Identity Token's sub (${originalSubject}) does not match new token's sub (${newSubject})`,
            `sub-validation-failed-refresh`,
            context
        );
    }
}

export class IssuedAtValidationError extends TokenValidationError {
    constructor(context: any) {
        super(
            `Issued At (iat) validation failed. Expected new iat to represent the time of the new token creation.`,
            `iat-validation-failed-refresh`,
            context
        );
    }
}

export class AudienceValidationError extends TokenValidationError {
    constructor(context: any) {
        super(
            `Audience (aud) validation failed. Original Identity Token's aud does not match new token's aud`,
            `aud-validation-failed-refresh`,
            context
        );
    }
}

export class AuthTimeValidationError extends TokenValidationError {
    constructor(context: any) {
        super(
            `Auth Time (auth_time) validation failed. Original Identity Token's auth_time does not match new token's auth_time`,
            `auth-time-validation-failed-refresh`,
            context
        );
    }
}

export class AuthorizedPartyValidationError extends TokenValidationError {
    constructor(context: any) {
        super(
            `Authorized Party (azp) validation failed. Original Identity Token's azp does not match new token's azp`,
            `azp-validation-failed-refresh`,
            context
        );
    }
}

