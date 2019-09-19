import { SimpleOidcError } from 'angular-simple-oidc/core';

export class ChildWindowClosedError extends SimpleOidcError {
    constructor(context: any) {
        super(
            `Child window has been closed, no response was received`,
            `child-window-closed`,
            context
        );
    }
}

export class PopupAuthorizationConfigurationMissingError extends SimpleOidcError {
    constructor() {
        super(
            `Expected POPUP_AUTHORIZATION_CONFIG to be in Injector.` +
            `\nYou need to provide a configuration either with PopupAuthorizationModule.forRoot() ` +
            `or by adding your own (Observable<PopupAuthorizationConfig> | PopupAuthorizationConfig) ` +
            `into the injector with the POPUP_AUTHORIZATION_CONFIG injection token.`,
            `popup-authorization-config-missing`,
            null
        );
    }
}
