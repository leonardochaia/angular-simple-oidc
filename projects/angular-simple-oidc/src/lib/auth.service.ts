import { Injectable } from '@angular/core';
import { TokenStorageService } from './token/token-storage.service';
import { map } from 'rxjs/operators';
import { OidcCodeFlowClient } from './token/oidc-code-flow-client.service';
import { TokenHelperService } from './token/token-helper.service';

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

    constructor(
        protected readonly oidcClient: OidcCodeFlowClient,
        protected readonly tokenHelper: TokenHelperService,
        protected readonly tokenStorage: TokenStorageService
    ) { }

    public startCodeFlow() {
        return this.oidcClient.startCodeFlow();
    }
}
