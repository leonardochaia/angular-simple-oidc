import { APP_INITIALIZER, FactoryProvider } from '@angular/core';
import { AuthConfigService } from './config/auth-config.service';
import { WINDOW_REF } from './constants';
import { OidcCodeFlowClient } from './oidc-code-flow-client.service';
import { EventsService } from './events/events.service';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

// This APP_INITIALIZER makes sure the OAuthService is ready
// must be an export function for AOT to work
export function simpleOidcInitializer(
  config: AuthConfigService,
  oidcCodeFlowClient: OidcCodeFlowClient,
  events: EventsService,
  window: Window) {
  return () => {

    if (config.configuration.enableAuthorizationCallbackAppInitializer
      && window.location.pathname.includes(config.configuration.tokenCallbackRoute)) {

      // Will do a callback, if the url has a code and state parameter.
      return oidcCodeFlowClient
        .codeFlowCallback()
        .pipe(catchError(e => {

          // make sure this errors get logged.
          console.error('Callback failed in APP_INITIALIZER');
          console.error(e);

          events.dispatchError(e);

          // Do not prevent bootstrapping in order to be able to handle errors gracefully.
          return of();
        }))
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
    EventsService,
    WINDOW_REF
  ],
  multi: true,
};
