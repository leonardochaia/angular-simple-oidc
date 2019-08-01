import { APP_INITIALIZER, FactoryProvider } from '@angular/core';
import { AuthConfigService } from './config/auth-config.service';
import { WINDOW_REF } from './constants';
import { OidcCodeFlowClient } from './token/oidc-code-flow-client.service';

// This APP_INITIALIZER makes sure the OAuthService is ready
// must be an export function for AOT to work
export function simpleOidcInitializer(
  config: AuthConfigService,
  oidcCodeFlowClient: OidcCodeFlowClient,
  window: Window) {
  return () => {

    if (config.configuration.enableAuthorizationCallbackAppInitializer
      && window.location.pathname.includes(config.configuration.tokenCallbackRoute)) {
      console.info('Attempting token callback..');
      // Will do a callback, if the url has a code and state parameter.
      return oidcCodeFlowClient
        .codeFlowCallback()
        .toPromise();
    }
  };
}

export const SIMPLE_OIDC_APP_INITIALIZER: FactoryProvider = {
  provide: APP_INITIALIZER,
  useFactory: simpleOidcInitializer,
  deps: [
    AuthConfigService,
    OidcCodeFlowClient,
    WINDOW_REF
  ],
  multi: true,
};
