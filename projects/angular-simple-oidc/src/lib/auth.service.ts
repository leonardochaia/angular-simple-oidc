import { Injectable } from '@angular/core';
import { TokenStorageService } from './token/token-storage.service';
import { map } from 'rxjs/operators';
import { OidcCodeFlowClient } from './token/oidc-code-flow-client.service';

@Injectable()
export class AuthService {

    public get isLoggedIn$() {
        return this.accessToken$
            .pipe(
                map(at => !!at)
            )
    }

    public get accessToken$() {
        return this.tokenStorage.currentState$
            .pipe(map(s => s.accessToken));
    }

    constructor(
        protected readonly oidcClient: OidcCodeFlowClient,
        protected readonly tokenStorage: TokenStorageService
    ) { }

    public startCodeFlow() {
        return this.oidcClient.startCodeFlow();
    }
}
