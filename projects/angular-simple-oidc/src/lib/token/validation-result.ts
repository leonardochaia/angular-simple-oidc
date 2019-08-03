
export interface ValidationResult {
    success: boolean;
    message?: string;
    errorCode?: string;
}

// @dynamic
export class ValidationResult {

    public static readonly NoErrors: ValidationResult = {
        success: true,
    };

    public static readonly missingJWTKeys: ValidationResult = {
        success: false,
        message: 'Provided keys are empty or invalid.',
        errorCode: 'missing-jwt-keys'
    };

    public static readonly invalidJWTKeys: ValidationResult = {
        success: false,
        message: `Failed to find a valid key from provided JWT Keys.
        No key with kty=RSA and use=sig found.`,
        errorCode: 'invalid-jwt-keys'
    };

    public static readonly failedToObtainTokenHeader: ValidationResult = {
        success: false,
        message: 'Failed to obtain a header from token',
        errorCode: 'token-header-invalid'
    };

    public static readonly onlyRSASupported: ValidationResult = {
        success: false,
        message: 'Only RSA alg is supported',
        errorCode: 'only-rsa-supported'
    };

    public static readonly incorrectSignature: ValidationResult = {
        success: false,
        message: 'Incorrect Signature. Identity Token Validation Failed',
        errorCode: 'incorrect-signature'
    };

    public static readonly authorizeCallbackWithoutCode: ValidationResult = {
        success: false,
        message: 'Authorize callback was redirected without an authorization code',
        errorCode: 'authorize-callback-no-authorization-code'
    };

    public static readonly idTokenInvalid = (idToken = '') => ({
        success: false,
        message: `Identity token is invalid or empty
        Identity Token: ${idToken}`,
        errorCode: 'id-token-invalid'
    } as ValidationResult)

    public static readonly idTokenInvalidNoDots = (idToken: string, dotAmount: number) => ({
        success: false,
        message: `Identity token invalid, it needs to have ${dotAmount} dots.
        Identity Token: ${idToken}`,
        errorCode: 'id-token-invalid-three-dots'
    } as ValidationResult)

    public static readonly claimRequired = (claim: string) => ({
        success: false,
        message: `Required claim "${claim}" was missing.`,
        errorCode: `claim-${claim}-missing`
    } as ValidationResult)

    public static readonly claimTypeInvalid = (claim: string, expectedType: string, currentType: string) => ({
        success: false,
        message: `Claim "${claim}" is expected to be a ${expectedType}, got ${currentType} instead.`,
        errorCode: `claim-${claim}-invalid`
    } as ValidationResult)

    public static readonly claimDateInvalid = (claim: string) => ({
        success: false,
        message: `Failed to obtain a date from "${claim}".`,
        errorCode: `claim-${claim}-malformed`
    } as ValidationResult)

    public static readonly tokenExpired = (exp = '') => ({
        success: false,
        message: `Token has expired
    Expiration ${exp}`,
        errorCode: 'token-expired'
    } as ValidationResult)

    public static readonly iatValidationFailed = (exp = '') => ({
        success: false,
        message: `iat validation has failed.
    ${exp}`,
        errorCode: 'iat-validation-failed'
    } as ValidationResult)

    public static readonly nonceValidationFailed = (exp = '') => ({
        success: false,
        message: `Invalid nonce.
    Provided nonce does not match local stored nonce.
    Are you performing multiple authorize calls at the same time?
    ${exp}`,
        errorCode: 'nonce-validation-failed'
    } as ValidationResult)

    public static readonly stateValidationFailed = (exp = '') => ({
        success: false,
        message: `Invalid state.
    Provided state does not match local stored state.
    Are you performing multiple authorize calls at the same time?
    ${exp}`,
        errorCode: 'state-validation-failed'
    } as ValidationResult)

    public static readonly atHashValidationFailed = (exp = '') => ({
        success: false,
        message: `Access Token Hash (at_hash) validation failed.
    Provided at_hash does not match hash of access token.
    ${exp}`,
        errorCode: 'at-hash-validation-failed'
    } as ValidationResult)

    public static readonly issValidationFailed = (exp = '') => ({
        success: false,
        message: `Issuer (iss) validation failed.
    Provided iss does not match hash of access token.
    ${exp}`,
        errorCode: 'iss-validation-failed'
    } as ValidationResult)

    public static readonly audValidationFailed = (exp = '') => ({
        success: false,
        message: `Audience (aud) validation failed.
    Provided aud does not include client_id. (token is not intended for this client?)
    ${exp}`,
        errorCode: 'aud-validation-failed'
    } as ValidationResult)
}
