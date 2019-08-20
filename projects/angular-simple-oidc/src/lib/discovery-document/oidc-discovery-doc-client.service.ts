import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { throwError, of } from 'rxjs';
import { switchMap, catchError, shareReplay, tap } from 'rxjs/operators';
import { DiscoveryDocument, JWTKeys } from 'angular-simple-oidc/core';
import { urlJoin } from '../utils/url-join';
import { AuthConfigService } from '../config/auth-config.service';
import { ObtainDiscoveryDocumentError, ObtainJWTKeysError } from './errors';
import { EventsService } from '../events/events.service';
import { SimpleOidcInfoEvent } from '../events/models';

@Injectable()
export class OidcDiscoveryDocClient {

    public get discoveryDocumentAbsoluteEndpoint() {
        return urlJoin(this.config.configuration.openIDProviderUrl,
            this.config.configuration.discoveryDocumentUrl);
    }

    public readonly current$ = this.requestDiscoveryDocument()
        .pipe(shareReplay());

    public readonly jwtKeys$ = this.current$
        .pipe(
            switchMap(doc => this.requestJWTKeys(doc)),
            shareReplay()
        );

    constructor(
        protected readonly config: AuthConfigService,
        protected readonly http: HttpClient,
        protected readonly events: EventsService) { }

    public requestDiscoveryDocument() {
        return of(null)
            .pipe(
                tap(() => this.events.dispatch(new SimpleOidcInfoEvent('Obtaining discovery document',
                    this.discoveryDocumentAbsoluteEndpoint))),
                switchMap(() => this.http.get<DiscoveryDocument>(this.discoveryDocumentAbsoluteEndpoint)),
                tap(d => this.events.dispatch(new SimpleOidcInfoEvent('Discovery Document obtained', d))),
                catchError(e => throwError(new ObtainDiscoveryDocumentError(e)))
            );
    }

    public requestJWTKeys(doc: DiscoveryDocument) {
        return of(null)
            .pipe(
                tap(() => this.events.dispatch(new SimpleOidcInfoEvent('Obtaining JWT Keys', doc.jwks_uri))),
                switchMap(() => this.http.get<JWTKeys>(doc.jwks_uri)),
                tap(j => this.events.dispatch(new SimpleOidcInfoEvent('JWT Keys obtained', j))),
                catchError(e => throwError(new ObtainJWTKeysError(e)))
            );
    }
}
