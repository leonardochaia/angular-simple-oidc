import { ValidationResult } from './validation-result';
import { runValidations } from './token-validations-runner';

describe('TokenValidationRunner', () => {

  it('should run all validation functions', () => {
    const validatorSpy = jasmine.createSpy();
    validatorSpy.and.returnValue(ValidationResult.NoErrors);

    const validations: (() => ValidationResult)[] = [
      validatorSpy
    ];


    const output = runValidations(validations);
    expect(output.success).toBeTruthy();
    expect(validatorSpy).toHaveBeenCalled();
  });

  it('should stop early when a function fails', () => {
    const spies = [
      jasmine.createSpy(),
      jasmine.createSpy(),
      jasmine.createSpy(),
    ];

    spies[0].and.returnValue(ValidationResult.NoErrors);
    spies[1].and.returnValue(ValidationResult.missingJWTKeys);
    spies[2].and.returnValue(ValidationResult.NoErrors);

    const validations: (() => ValidationResult)[] = spies;

    const output = runValidations(validations);
    expect(output.success).toBeFalsy();
    expect(output.errorCode).toBe(ValidationResult.missingJWTKeys.errorCode);
    expect(spies[0]).toHaveBeenCalled();
    expect(spies[1]).toHaveBeenCalled();
    expect(spies[2]).not.toHaveBeenCalled();
  });

  it('should stop early when a function returns invalid result', () => {
    const spies = [
      jasmine.createSpy(),
      jasmine.createSpy(),
      jasmine.createSpy(),
    ];

    spies[0].and.returnValue(ValidationResult.NoErrors);
    spies[1].and.returnValue(null);
    spies[2].and.returnValue(ValidationResult.NoErrors);

    const validations: (() => ValidationResult)[] = spies;
    expect(() => runValidations(validations))
      .toThrowError(/failed to produce a valid output/);

    expect(spies[0]).toHaveBeenCalled();
    expect(spies[1]).toHaveBeenCalled();
    expect(spies[2]).not.toHaveBeenCalled();
  });
});
