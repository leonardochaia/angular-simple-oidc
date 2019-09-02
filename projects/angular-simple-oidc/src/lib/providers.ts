import { InjectionToken, Provider, APP_INITIALIZER, Optional } from '@angular/core';
import { Observable, isObservable, of } from 'rxjs';
import { ConfigService } from 'angular-simple-oidc/config';
import { AuthConfig, AUTH_CONFIG_REQUIRED_FIELDS } from './config/models';
import { tap, catchError, map } from 'rxjs/operators';
import { EventsService } from 'angular-simple-oidc/events';
import { AuthenticationConfigurationMissingError } from './errors';

export const WINDOW_REF = new InjectionToken('Angular Simple OIDC Window Reference');
export const LOCAL_STORAGE_REF = new InjectionToken('Angular Simple OIDC LocalStorage Reference');

export function localStorageFactory(): Storage {
    return localStorage;
}

export const LOCAL_STORAGE_PROVIDER: Provider = {
    provide: LOCAL_STORAGE_REF,
    useFactory: localStorageFactory
};

export function windowFactory(): Window {
    return window;
}

export const WINDOW_PROVIDER: Provider = {
    provide: WINDOW_REF,
    useFactory: windowFactory
};

// Configuration
export const AUTH_CONFIG_SERVICE = new InjectionToken<ConfigService<AuthConfig>>('AUTH_CONFIG');

export const AUTH_CONFIG = new InjectionToken<Observable<AuthConfig> | AuthConfig>('AUTH_CONFIG');

const defaultConfig: Partial<AuthConfig> = {
    discoveryDocumentUrl: `/.well-known/openid-configuration`,
    tokenCallbackRoute: 'oidc-token-callback',
    tokenValidation: {
        disableIdTokenIATValidation: false,
        idTokenIATOffsetAllowed: 10 // seconds
    },
    enableAuthorizationCallbackAppInitializer: true
};

export function authConfigFactory(
    configInput: Observable<AuthConfig> | AuthConfig,
    configService: ConfigService<AuthConfig>,
    window: Window,
    events: EventsService) {

    if (!configInput) {
        throw new AuthenticationConfigurationMissingError();
    }

    const config$ = isObservable(configInput) ? configInput : of(configInput);

    return () => config$.pipe(
        map(config => {
            if (config.openIDProviderUrl) {
                config.openIDProviderUrl = config.openIDProviderUrl.toLowerCase();
            }
            return config;
        }),
        tap(config => configService.configure(config, {
            defaultConfig: {
                ...defaultConfig,
                baseUrl: `${window.location.protocol}//${window.location.host}${window.location.pathname}`,
            },
            requiredFields: AUTH_CONFIG_REQUIRED_FIELDS
        })),
        catchError(e => {

            // make sure this errors get logged.
            console.error('Callback failed in AUTH_CONFIG_INITIALIZER');
            console.error(e);

            events.dispatchError(e);

            // Do not prevent bootstrapping in order to be able to handle errors gracefully.
            return of(null);
        })
    )
        .toPromise();
}

export const AUTH_CONFIG_INITIALIZER = {
    multi: true,
    provide: APP_INITIALIZER,
    deps: [
        [new Optional(), AUTH_CONFIG],
        AUTH_CONFIG_SERVICE,
        WINDOW_REF,
        EventsService
    ],
    useFactory: authConfigFactory
};

export const AUTH_CONFIG_SERVICE_PROVIDER: Provider = {
    provide: AUTH_CONFIG_SERVICE,
    useClass: ConfigService,
};
