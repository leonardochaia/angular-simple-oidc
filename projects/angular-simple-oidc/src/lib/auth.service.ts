import { Injectable } from '@angular/core';
import { TokenStorageService } from './token-storage.service';
import { map, tap } from 'rxjs/operators';
import { OidcCodeFlowClient } from './oidc-code-flow-client.service';
import { TokenHelperService } from 'angular-simple-oidc/core';
import { RefreshTokenClient } from './refresh-token-client.service';
import { EventsService } from './events/events.service';
import { EndSessionClientService } from './end-session-client.service';
import { AuthConfigService } from './config/auth-config.service';

@Injectable()
export class AuthService {

    public get isLoggedIn$() {
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

    public get accessToken$() {
        return this.tokenStorage.currentState$
            .pipe(map(s => s.accessToken));
    }

    public get tokenExpiration$() {
        return this.tokenStorage.currentState$
            .pipe(map(s => s.accessTokenExpiration));
    }

    public get refreshToken$() {
        return this.tokenStorage.currentState$
            .pipe(map(s => s.refreshToken));
    }

    public get identityToken$() {
        return this.tokenStorage.currentState$
            .pipe(map(s => s.identityToken));
    }

    public get identityTokenDecoded$() {
        return this.tokenStorage.currentState$
            .pipe(map(s => s.decodedIdentityToken));
    }

    public get events$() {
        return this.events.events$;
    }

    public get errors$() {
        return this.events.errors$;
    }

    constructor(
        protected readonly oidcClient: OidcCodeFlowClient,
        protected readonly tokenHelper: TokenHelperService,
        protected readonly tokenStorage: TokenStorageService,
        protected readonly refreshTokenClient: RefreshTokenClient,
        protected readonly endSessionClient: EndSessionClientService,
        protected readonly authConfig: AuthConfigService,
        protected readonly events: EventsService,
    ) { }

    public startCodeFlow() {
        return this.oidcClient.startCodeFlow()
            .pipe(tap({ error: e => this.events.dispatchError(e) }));
    }

    public refreshAccessToken() {
        return this.refreshTokenClient.requestTokenWithRefreshCode()
            .pipe(tap({ error: e => this.events.dispatchError(e) }));
    }

    public endSession(postLogoutRedirectUri = this.authConfig.baseUrl) {
        return this.endSessionClient.logoutWithRedirect(postLogoutRedirectUri)
            .pipe(tap({ error: e => this.events.dispatchError(e) }));
    }
}
