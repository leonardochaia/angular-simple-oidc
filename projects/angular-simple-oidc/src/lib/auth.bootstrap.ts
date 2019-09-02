import { APP_INITIALIZER, FactoryProvider } from '@angular/core';
import { WINDOW_REF, AUTH_CONFIG_SERVICE } from './providers';
import { OidcCodeFlowClient } from './oidc-code-flow-client.service';
import { of } from 'rxjs';
import { catchError, take, switchMap } from 'rxjs/operators';
import { ConfigService } from 'angular-simple-oidc/config';
import { AuthConfig } from './config/models';
import { EventsService } from 'angular-simple-oidc/events';

// This APP_INITIALIZER makes sure the OAuthService is ready
// must be an export function for AOT to work
export function simpleOidcInitializer(
  configService: ConfigService<AuthConfig>,
  oidcCodeFlowClient: OidcCodeFlowClient,
  events: EventsService,
  window: Window) {
  return () => {

    return configService.current$
      .pipe(
        take(1),
        switchMap(config => {
          if (config.enableAuthorizationCallbackAppInitializer
            && window.location.pathname.includes(config.tokenCallbackRoute)) {
            return oidcCodeFlowClient.codeFlowCallback();
          } else {
            return of(null);
          }
        }),
        catchError(e => {

          // make sure this errors get logged.
          console.error('Callback failed in APP_INITIALIZER');
          console.error(e);

          events.dispatchError(e);

          // Do not prevent bootstrapping in order to be able to handle errors gracefully.
          return of(null);
        })
      )
      .toPromise();
  };
}

export const SIMPLE_OIDC_APP_INITIALIZER: FactoryProvider = {
  provide: APP_INITIALIZER,
  useFactory: simpleOidcInitializer,
  deps: [
    AUTH_CONFIG_SERVICE,
    OidcCodeFlowClient,
    EventsService,
    WINDOW_REF
  ],
  multi: true,
};
