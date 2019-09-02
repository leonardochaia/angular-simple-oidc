import { Injectable, Inject } from '@angular/core';
import { TokenStorageService } from './token-storage.service';
import { map, tap, switchMap, take } from 'rxjs/operators';
import { OidcCodeFlowClient } from './oidc-code-flow-client.service';
import { TokenHelperService, DecodedIdentityToken, LocalState, TokenRequestResult } from 'angular-simple-oidc/core';
import { RefreshTokenClient } from './refresh-token-client.service';
import { EndSessionClientService } from './end-session-client.service';
import { Observable } from 'rxjs';
import { AUTH_CONFIG_SERVICE } from './providers';
import { ConfigService } from 'angular-simple-oidc/config';
import { AuthConfig } from './config/models';
import { EventsService, SimpleOidcEvent, SimpleOidcErrorEvent } from 'angular-simple-oidc/events';

@Injectable()
export class AuthService {

    public get isLoggedIn$(): Observable<boolean> {
        return this.tokenStorage.currentState$
            .pipe(
                map(({ accessToken, accessTokenExpiration }) => {
                    if (!accessToken || this.tokenHelper.isTokenExpired(accessTokenExpiration)) {
                        return false;
                    }

                    return true;
                })
            );
    }

    public get accessToken$(): Observable<string> {
        return this.tokenStorage.currentState$
            .pipe(map(s => s.accessToken));
    }

    public get tokenExpiration$(): Observable<Date> {
        return this.tokenStorage.currentState$
            .pipe(map(s => new Date(s.accessTokenExpiration)));
    }

    public get refreshToken$(): Observable<string> {
        return this.tokenStorage.currentState$
            .pipe(map(s => s.refreshToken));
    }

    public get identityToken$(): Observable<string> {
        return this.tokenStorage.currentState$
            .pipe(map(s => s.identityToken));
    }

    public get identityTokenDecoded$(): Observable<DecodedIdentityToken> {
        return this.tokenStorage.currentState$
            .pipe(map(s => s.decodedIdentityToken));
    }

    public get events$(): Observable<SimpleOidcEvent> {
        return this.events.events$;
    }

    public get errors$(): Observable<SimpleOidcErrorEvent> {
        return this.events.errors$;
    }

    constructor(
        protected readonly oidcClient: OidcCodeFlowClient,
        protected readonly tokenHelper: TokenHelperService,
        protected readonly tokenStorage: TokenStorageService,
        protected readonly refreshTokenClient: RefreshTokenClient,
        protected readonly endSessionClient: EndSessionClientService,
        @Inject(AUTH_CONFIG_SERVICE)
        protected readonly config: ConfigService<AuthConfig>,
        protected readonly events: EventsService,
    ) { }

    public startCodeFlow(): Observable<LocalState> {
        return this.oidcClient.startCodeFlow()
            .pipe(tap({ error: e => this.events.dispatchError(e) }));
    }

    public refreshAccessToken(): Observable<TokenRequestResult> {
        return this.refreshTokenClient.requestTokenWithRefreshCode()
            .pipe(tap({ error: e => this.events.dispatchError(e) }));
    }

    public endSession(postLogoutRedirectUri?: string) {
        return this.config.current$
            .pipe(
                take(1),
                switchMap(config => this.endSessionClient.logoutWithRedirect(postLogoutRedirectUri || config.baseUrl)),
                tap({ error: e => this.events.dispatchError(e) }),
            );
    }
}
