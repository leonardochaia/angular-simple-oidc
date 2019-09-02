import { SimpleOidcInfoEvent } from 'angular-simple-oidc/events';

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
