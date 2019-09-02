import { SimpleOidcError } from 'angular-simple-oidc/core';

export class RequiredConfigurationMissingError<TConfig> extends SimpleOidcError {
    constructor(context: { config: TConfig, requiredFields: (keyof TConfig)[] }) {
        super(
            `Required field was not present in provided configuration`,
            `config-required-field-missing`,
            context
        );
    }
}
