
export class SimpleOidcError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly context: any) {
        super(message);
        this.name = code;
    }
}

export class RequiredParemetersMissingError extends SimpleOidcError {
    constructor(paramName: string, context: any) {
        super(
            `Expected a valid value in provided parameter: ${paramName}`,
            'required-param-missing',
            context
        );
    }
}
