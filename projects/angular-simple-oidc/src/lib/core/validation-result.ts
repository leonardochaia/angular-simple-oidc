
export interface ValidationResult {
    success: boolean;
    message?: string;
    errorCode?: string;
}

// @dynamic
export class ValidationResult {

    public static readonly noErrors: ValidationResult = {
        success: true,
    };

    public static readonly missingJWTKeys: ValidationResult = {
        success: false,
        message: 'Provided keys are empty or invalid.',
        errorCode: 'missing-jwt-keys'
    };
}
