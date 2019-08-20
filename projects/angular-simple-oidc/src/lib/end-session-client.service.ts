import { Injectable, Inject } from '@angular/core';
import { switchMap, take, map, tap } from 'rxjs/operators';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import { EventsService } from './events/events.service';
import { SimpleOidcInfoEvent } from './events/models';
import { WINDOW_REF } from './constants';
import { TokenUrlService } from 'angular-simple-oidc/core';
import { TokenStorageService } from './token-storage.service';
import { combineLatest } from 'rxjs';

// @dynamic
@Injectable()
export class EndSessionClientService {

    constructor(
        @Inject(WINDOW_REF)
        protected readonly window: Window,
        protected readonly discoveryDocumentClient: OidcDiscoveryDocClient,
        protected readonly tokenUrl: TokenUrlService,
        protected readonly tokenStorage: TokenStorageService,
        protected readonly events: EventsService,
    ) { }

    public logoutWithRedirect(postLogoutRedirectUri?: string) {
        const doc$ = this.discoveryDocumentClient.current$;
        const localState$ = this.tokenStorage.currentState$;

        return combineLatest(doc$, localState$)
            .pipe(
                take(1),
                map(([doc, localState]) => this.tokenUrl.createEndSessionUrl(doc.end_session_endpoint, {
                    idTokenHint: localState.identityToken,
                    postLogoutRedirectUri
                })),
                switchMap(result => {
                    this.events.dispatch(new SimpleOidcInfoEvent('Deleting Local Session'));
                    return this.tokenStorage.removeAll()
                        .pipe(map(() => result));
                }),
                tap(({ url }) => {
                    this.events.dispatch(new SimpleOidcInfoEvent('Redirecting to End Session Endpoint', url));
                    this.window.location.href = url;
                }),
            );
    }
}
