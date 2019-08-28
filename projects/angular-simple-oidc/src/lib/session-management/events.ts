import { SimpleOidcInfoEvent } from '../events/models';

export class SessionChangedEvent extends SimpleOidcInfoEvent {
    constructor() {
        super(
            `Session has changed.`
        );
    }
}

export class SessionTerminatedEvent extends SimpleOidcInfoEvent {
    constructor(context?: any) {
        super(
            `Session has been terminated.`,
            context
        );
    }
}
