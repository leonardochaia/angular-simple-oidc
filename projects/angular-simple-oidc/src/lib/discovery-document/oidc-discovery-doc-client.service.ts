import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { throwError } from 'rxjs';
import { switchMap, catchError, shareReplay, tap, map, take } from 'rxjs/operators';
import { DiscoveryDocument, JWTKeys } from 'angular-simple-oidc/core';
import { urlJoin } from '../utils/url-join';
import { ObtainDiscoveryDocumentError, ObtainJWTKeysError } from './errors';
import { ConfigService } from 'angular-simple-oidc/config';
import { AuthConfig } from '../config/models';
import { AUTH_CONFIG_SERVICE } from '../providers';
import { EventsService, SimpleOidcInfoEvent } from 'angular-simple-oidc/events';
import { DiscoveryDocumentObtainedEvent } from './events';

@Injectable()
export class OidcDiscoveryDocClient {

    public readonly current$ = this.config.current$
        .pipe(
            map(config => urlJoin(config.openIDProviderUrl, config.discoveryDocumentUrl)),
            tap(url => this.events.dispatch(new SimpleOidcInfoEvent('Obtaining discovery document', url))),
            switchMap(url => this.http.get<DiscoveryDocument>(url)),
            tap(doc => this.events.dispatch(new DiscoveryDocumentObtainedEvent(doc))),
            catchError(e => throwError(new ObtainDiscoveryDocumentError(e))),
            take(1),
            shareReplay()
        );

    public readonly jwtKeys$ = this.current$
        .pipe(
            tap(doc => this.events.dispatch(new SimpleOidcInfoEvent('Obtaining JWT Keys', doc.jwks_uri))),
            switchMap(doc => this.http.get<JWTKeys>(doc.jwks_uri)),
            tap(j => this.events.dispatch(new SimpleOidcInfoEvent('JWT Keys obtained', j))),
            catchError(e => throwError(new ObtainJWTKeysError(e))),
            take(1),
            shareReplay()
        );

    constructor(
        @Inject(AUTH_CONFIG_SERVICE)
        protected readonly config: ConfigService<AuthConfig>,
        protected readonly http: HttpClient,
        protected readonly events: EventsService,
    ) { }
}
