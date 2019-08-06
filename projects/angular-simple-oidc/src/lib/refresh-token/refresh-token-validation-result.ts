import { ValidationResult } from '../token/validation-result';

// @dynamic
export class RefreshTokenValidationResult {

    public static readonly missingJWTKeys: ValidationResult = {
        success: false,
        message: 'Provided keys are empty or invalid.',
        errorCode: 'missing-jwt-keys'
    };

    public static readonly issValidationFailed = (exp = '') => ({
        success: false,
        message: `Issuer (iss) validation failed.
        Original iss does not match new token's iss.
    ${exp}`,
        errorCode: 'refresh-iss-validation-failed'
    } as ValidationResult)

    public static readonly subValidationFailed = (exp = '') => ({
        success: false,
        message: `Subject (sub) validation failed.
    Original sub does not match new token's iss.
    ${exp}`,
        errorCode: 'refresh-sub-validation-failed'
    } as ValidationResult)

    public static readonly iatValidationFailed = (exp = '') => ({
        success: false,
        message: `Issued At (iat) validation failed.
    Expected new iat to represent the time of the new token creation.
    ${exp}`,
        errorCode: 'refresh-iat-validation-failed'
    } as ValidationResult)

    public static readonly audValidationFailed = (exp = '') => ({
        success: false,
        message: `Audience (aud) validation failed.
    Original aud does not match new token's aud.
    ${exp}`,
        errorCode: 'refresh-aud-validation-failed'
    } as ValidationResult)

    public static readonly authTimeValidationFailed = (exp = '') => ({
        success: false,
        message: `Auth Time (auth_time) validation failed.
    Original auth_time does not match new token's auth_time.
    ${exp}`,
        errorCode: 'refresh-auth-time-validation-failed'
    } as ValidationResult)

    public static readonly azpValidationFailed = (exp = '') => ({
        success: false,
        message: `Authorized Party (azp) validation failed.
    Original azp does not match new token's azp.
    ${exp}`,
        errorCode: 'refresh-azp-validation-failed'
    } as ValidationResult)

}
