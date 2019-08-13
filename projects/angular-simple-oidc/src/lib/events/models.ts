import { SimpleOidcError } from '../core/errors';

export abstract class SimpleOidcEvent { }

export class SimpleOidcErrorEvent {
    constructor(public readonly error: SimpleOidcError) { }
}

export class SimpleOidcInfoEvent<TPayload = any> extends SimpleOidcEvent {
    constructor(
        public readonly message: string,
        public readonly payload?: TPayload
    ) {
        super();
    }
}
