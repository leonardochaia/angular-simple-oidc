import { Injectable } from '@angular/core';
import { take, tap, switchMap } from 'rxjs/operators';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import { TokenStorageService } from './token-storage.service';
import { combineLatest } from 'rxjs';
import { EventsService, SimpleOidcInfoEvent } from 'angular-simple-oidc/events';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UserInfoNotSupportedError } from './errors';
import { ClaimCollection } from './models';
import { UserInfoObtainedEvent } from './auth.events';

// @dynamic
@Injectable()
export class UserInfoClientService {

    constructor(
        protected readonly discoveryDocumentClient: OidcDiscoveryDocClient,
        protected readonly tokenStorage: TokenStorageService,
        protected readonly events: EventsService,
        protected readonly http: HttpClient,
    ) { }

    public getUserInfo() {
        const doc$ = this.discoveryDocumentClient.current$;
        const localState$ = this.tokenStorage.currentState$;

        return combineLatest(doc$, localState$)
            .pipe(
                take(1),
                tap(() => this.events.dispatch(new SimpleOidcInfoEvent('Requesting User Info'))),
                tap(([doc]) => {
                    if (!doc.userinfo_endpoint) {
                        throw new UserInfoNotSupportedError(doc);
                    }
                }),
                switchMap(([doc, localState]) =>
                    this.http.get<ClaimCollection>(doc.userinfo_endpoint, {
                        headers: new HttpHeaders({ authorization: `Bearer ${localState.accessToken}` })
                    })),
                tap(profile => this.events.dispatch(new UserInfoObtainedEvent(profile))),
            );
    }
}
