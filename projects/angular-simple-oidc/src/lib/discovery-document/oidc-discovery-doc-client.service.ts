import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DiscoveryDocument, JWTKeys } from './models';
import { urlJoin } from '../utils/url-join';
import { AuthConfigService } from '../config/auth-config.service';

@Injectable()
export class OidcDiscoveryDocClient {

    public readonly discoveryDocumentAbsoluteEndpoint = urlJoin(
        this.config.configuration.openIDProviderUrl,
        this.config.configuration.discoveryDocumentUrl);

    public get current$() {
        if (this.subject.value != null) {
            return this.subject.asObservable();
        } else {
            console.info('Obtaining discovery document..');
            return this.requestDiscoveryDocument()
                .pipe(switchMap(doc => {
                    this.subject.next(doc);
                    return this.subject.asObservable();
                }));
        }
    }

    public get jwtKeys$() {
        if (this.jwtKeysSubject.value != null) {
            return this.jwtKeysSubject.asObservable();
        } else {
            return this.current$.pipe(
                switchMap(doc => {
                    console.info('Obtaining JWT Keys..');
                    return this.requestJWTKeys(doc)
                        .pipe(switchMap(keys => {
                            this.jwtKeysSubject.next(keys);
                            return this.jwtKeysSubject.asObservable();
                        }));
                }));
        }
    }

    protected subject = new BehaviorSubject<DiscoveryDocument>(null);
    protected jwtKeysSubject = new BehaviorSubject<JWTKeys>(null);

    constructor(
        protected readonly config: AuthConfigService,
        protected readonly http: HttpClient) { }

    public requestDiscoveryDocument() {
        return this.http
            .get<DiscoveryDocument>(this.discoveryDocumentAbsoluteEndpoint)
    }

    public requestJWTKeys(doc: DiscoveryDocument) {
        return this.http.get<JWTKeys>(doc.jwks_uri);
    }
}
