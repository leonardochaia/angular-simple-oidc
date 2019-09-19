import { InjectionToken, Provider, APP_INITIALIZER, Optional } from '@angular/core';
import { Observable, isObservable, of } from 'rxjs';
import { ConfigService } from 'angular-simple-oidc/config';
import { EventsService } from 'angular-simple-oidc/events';
import { tap, catchError } from 'rxjs/operators';
import { PopupAuthorizationConfig, POPUP_AUTHORIZATION_CONFIG_REQUIRED_FIELDS } from './models';
import { PopupAuthorizationConfigurationMissingError } from './errors';

export const POPUP_AUTHORIZATION_CONFIG_SERVICE =
    new InjectionToken<ConfigService<PopupAuthorizationConfig>>('POPUP_AUTHORIZATION_CONFIG_SERVICE');

export const POPUP_AUTHORIZATION_CONFIG =
    new InjectionToken<Observable<PopupAuthorizationConfig> | PopupAuthorizationConfig>('POPUP_AUTHORIZATION_CONFIG');

const defaultConfig: Partial<PopupAuthorizationConfig> = {};

export function PopupAuthorizationConfigFactory(
    configInput: Observable<PopupAuthorizationConfig> | PopupAuthorizationConfig,
    configService: ConfigService<PopupAuthorizationConfig>,
    events: EventsService) {

    if (!configInput) {
        throw new PopupAuthorizationConfigurationMissingError();
    }

    const config$ = isObservable(configInput) ? configInput : of(configInput);

    return () => config$.pipe(
        tap(config => configService.configure(config, {
            defaultConfig,
            requiredFields: POPUP_AUTHORIZATION_CONFIG_REQUIRED_FIELDS
        })),
        catchError(e => {

            // make sure this errors get logged.
            console.error('Callback failed in POPUP_AUTHORIZATION_CONFIG_INITIALIZER');
            console.error(e);

            events.dispatchError(e);

            // Do not prevent bootstrapping in order to be able to handle errors gracefully.
            return of(null);
        })
    )
        .toPromise();
}

export const POPUP_AUTHORIZATION_CONFIG_INITIALIZER = {
    multi: true,
    provide: APP_INITIALIZER,
    deps: [
        [new Optional(), POPUP_AUTHORIZATION_CONFIG],
        POPUP_AUTHORIZATION_CONFIG_SERVICE,
        EventsService
    ],
    useFactory: PopupAuthorizationConfigFactory
};

export const POPUP_AUTHORIZATION_CONFIG_SERVICE_PROVIDER: Provider = {
    provide: POPUP_AUTHORIZATION_CONFIG_SERVICE,
    useClass: ConfigService,
};
