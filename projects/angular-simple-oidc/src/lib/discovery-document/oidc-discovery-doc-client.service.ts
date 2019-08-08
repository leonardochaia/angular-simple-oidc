import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { switchMap, catchError, shareReplay } from 'rxjs/operators';
import { DiscoveryDocument, JWTKeys } from '../core/models';
import { urlJoin } from '../utils/url-join';
import { AuthConfigService } from '../config/auth-config.service';

@Injectable()
export class OidcDiscoveryDocClient {

    public get discoveryDocumentAbsoluteEndpoint() {
        return urlJoin(this.config.configuration.openIDProviderUrl,
        this.config.configuration.discoveryDocumentUrl);
        }

    public readonly current$ = this.requestDiscoveryDocument()
        .pipe(shareReplay({ refCount: true, bufferSize: 1 }));

    public readonly jwtKeys$ = this.current$
        .pipe(
            switchMap(doc => this.requestJWTKeys(doc)),
            shareReplay({ refCount: true, bufferSize: 1 })
        );

    constructor(
        protected readonly config: AuthConfigService,
        protected readonly http: HttpClient) { }

    public requestDiscoveryDocument() {
        console.info('Obtaining discovery document');
        return this.http.get<DiscoveryDocument>(this.discoveryDocumentAbsoluteEndpoint)
    }

    public requestJWTKeys(doc: DiscoveryDocument) {
        console.info('Obtaining JWT Keys');
        return this.http.get<JWTKeys>(doc.jwks_uri)
    }
}
