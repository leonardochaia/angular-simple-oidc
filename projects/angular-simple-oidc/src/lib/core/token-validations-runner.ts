import { ValidationResult } from './validation-result';

export function runValidations(validations: (() => ValidationResult)[]) {
    // If a validation does not return a valid result,
    // or a falsy result, we stop the loop and return.
    for (const fn of validations) {
        const output = fn();
        if (!output) {
            throw new Error(`Function[${validations.indexOf(fn)}] unexpectedly failed to produce a valid output.
            Function: ${fn.toString()}
            Result: ${output}`);
        }

        if (!output.success) {
            return output;
        }
    }

    // No errors where produced
    return ValidationResult.noErrors;
}
