
export class SimpleOidcError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly context: any) {
        super(message);
        this.name = code;
    }
}
