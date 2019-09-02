import { SimpleOidcError, DiscoveryDocument, LocalState } from 'angular-simple-oidc/core';

export class SessionCheckNotSupportedError extends SimpleOidcError {
    constructor(context: { doc: DiscoveryDocument, localState: LocalState }) {
        super(
            `Session check not supported by OP: check_session_iframe on discovery document and session_state are required`,
            `session-check-not-supported`,
            context
        );
    }
}

export class SessionCheckFailedError extends SimpleOidcError {
    constructor(context: any) {
        super(
            `OP iframe returned error. According to spec, message malformed?`,
            `session-check-error`,
            context
        );
    }
}

export class IframePostMessageTimeoutError extends SimpleOidcError {
    constructor(context: any) {
        super(
            `Iframe failed to postMessage back in given time.`,
            `iframe-post-message-timeout`,
            context
        );
    }
}

export class SessionManagementConfigurationMissingError extends SimpleOidcError {
    constructor() {
        super(
            `Expected SESSION_MANAGEMENT_CONFIG to be in Injector.` +
            `\nYou need to provide a configuration either with SessionManagementModule.forRoot() ` +
            `or by adding your own (Observable<SessionManagementConfig> | SessionManagementConfig) ` +
            `into the injector with the SESSION_MANAGEMENT_CONFIG injection token.`,
            `session-management-config-missing`,
            null
        );
    }
}
