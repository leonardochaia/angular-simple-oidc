import { InjectionToken, Provider, APP_INITIALIZER, Optional } from '@angular/core';
import { SessionManagementConfig, SESSION_MANAGEMENT_CONFIG_REQUIRED_FIELDS } from './models';
import { Observable, isObservable, of } from 'rxjs';
import { ConfigService } from 'angular-simple-oidc/config';
import { EventsService } from 'angular-simple-oidc/events';
import { tap, catchError } from 'rxjs/operators';
import { SessionManagementConfigurationMissingError } from './errors';

export const SESSION_MANAGEMENT_CONFIG_SERVICE =
    new InjectionToken<ConfigService<SessionManagementConfig>>('SESSION_MANAGEMENT_CONFIG_SERVICE');

export const SESSION_MANAGEMENT_CONFIG =
    new InjectionToken<Observable<SessionManagementConfig> | SessionManagementConfig>('SESSION_MANAGEMENT_CONFIG');

const defaultConfig: Partial<SessionManagementConfig> = {
    opIframePollInterval: 1 * 1000,
    iframeTimeout: 10 * 1000
};

export function sessionManagementConfigFactory(
    configInput: Observable<SessionManagementConfig> | SessionManagementConfig,
    configService: ConfigService<SessionManagementConfig>,
    events: EventsService) {

    if (!configInput) {
        throw new SessionManagementConfigurationMissingError();
    }

    const config$ = isObservable(configInput) ? configInput : of(configInput);

    return () => config$.pipe(
        tap(config => configService.configure(config, {
            defaultConfig,
            requiredFields: SESSION_MANAGEMENT_CONFIG_REQUIRED_FIELDS
        })),
        catchError(e => {

            // make sure this errors get logged.
            console.error('Callback failed in SESSION_MANAGEMENT_CONFIG_INITIALIZER');
            console.error(e);

            events.dispatchError(e);

            // Do not prevent bootstrapping in order to be able to handle errors gracefully.
            return of(null);
        })
    )
        .toPromise();
}

export const SESSION_MANAGEMENT_CONFIG_INITIALIZER = {
    multi: true,
    provide: APP_INITIALIZER,
    deps: [
        [new Optional(), SESSION_MANAGEMENT_CONFIG],
        SESSION_MANAGEMENT_CONFIG_SERVICE,
        EventsService
    ],
    useFactory: sessionManagementConfigFactory
};

export const SESSION_MANAGEMENT_CONFIG_SERVICE_PROVIDER: Provider = {
    provide: SESSION_MANAGEMENT_CONFIG_SERVICE,
    useClass: ConfigService,
};
