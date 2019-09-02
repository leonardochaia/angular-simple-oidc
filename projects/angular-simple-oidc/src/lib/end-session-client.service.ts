import { Injectable, Inject } from '@angular/core';
import { take, map, tap } from 'rxjs/operators';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import { WINDOW_REF } from './providers';
import { TokenUrlService } from 'angular-simple-oidc/core';
import { TokenStorageService } from './token-storage.service';
import { combineLatest } from 'rxjs';
import { switchTap } from 'angular-simple-oidc/operators';
import { EventsService, SimpleOidcInfoEvent } from 'angular-simple-oidc/events';

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
                switchTap(() => {
                    this.events.dispatch(new SimpleOidcInfoEvent('Deleting Local Session'));
                    return this.tokenStorage.removeAll();
                }),
                tap(({ url }) => {
                    this.events.dispatch(new SimpleOidcInfoEvent('Redirecting to End Session Endpoint', url));
                    this.window.location.href = url;
                }),
            );
    }
}
