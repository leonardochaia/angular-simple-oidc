import { SimpleOidcError } from '../core/errors';

export interface SimpleOidcEvent {
    readonly type: string;
}

export class SimpleOidcErrorEvent implements SimpleOidcEvent {
    public readonly type = 'Error Ocurred';
    constructor(public readonly error: SimpleOidcError) { }
}
