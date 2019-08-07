import { Injectable } from '@angular/core';
import { TokenStorageService } from './token-storage.service';
import { map } from 'rxjs/operators';
import { OidcCodeFlowClient } from './oidc-code-flow-client.service';
import { TokenHelperService } from './core/token-helper.service';
import { RefreshTokenClient } from './refresh-token-client.service';

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

    constructor(
        protected readonly oidcClient: OidcCodeFlowClient,
        protected readonly tokenHelper: TokenHelperService,
        protected readonly tokenStorage: TokenStorageService,
        protected readonly refreshTokenClient: RefreshTokenClient,
    ) { }

    public startCodeFlow() {
        return this.oidcClient.startCodeFlow();
    }

    public refreshAccesstoken() {
        return this.refreshTokenClient.requestTokenWithRefreshCode();
    }
}
