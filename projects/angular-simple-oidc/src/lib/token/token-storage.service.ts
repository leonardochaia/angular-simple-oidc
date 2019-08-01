import { Injectable } from '@angular/core';
import { TokenStorageKeys, TokenEndpointResponse, LocalState } from './models';
import { of, BehaviorSubject } from 'rxjs';
import { AuthConfigService } from '../config/auth-config.service';

@Injectable()
export class TokenStorageService {

    public get currentState$() {
        return this.localStateSubject.asObservable();
    }

    protected get storage() {
        return localStorage;
    }

    protected readonly localStateSubject = new BehaviorSubject<LocalState>(this.getCurrentLocalState());

    constructor(protected readonly config: AuthConfigService) { }

    public storePreAuthorizationState(authState: {
        nonce: string,
        state: string,
        codeVerifier: string,
        preRedirectUrl: string,
    }) {
        this.storage.setItem(TokenStorageKeys.Nonce, authState.nonce);
        this.storage.setItem(TokenStorageKeys.State, authState.state);
        this.storage.setItem(TokenStorageKeys.CodeVerifier, authState.codeVerifier);
        this.storage.setItem(TokenStorageKeys.PreRedirectUrl, authState.preRedirectUrl);
        const state = this.getCurrentLocalState();
        this.localStateSubject.next(state);
        return of(state);
    }

    public clearPreAuthorizationState() {
        this.storage.removeItem(TokenStorageKeys.Nonce);
        this.storage.removeItem(TokenStorageKeys.State);
        this.storage.removeItem(TokenStorageKeys.CodeVerifier);
        this.storage.removeItem(TokenStorageKeys.PreRedirectUrl);
        const state = this.getCurrentLocalState();
        this.localStateSubject.next(state);
        return of(state);
    }

    public storeAuthorizationCode(authorizationCode: string) {
        this.storage.setItem(TokenStorageKeys.AuthorizationCode, authorizationCode);
        const state = this.getCurrentLocalState();
        this.localStateSubject.next(state);
        return of(state);
    }

    public storeTokens(tokens: TokenEndpointResponse) {
        this.storage.setItem(TokenStorageKeys.AccessToken, tokens.access_token);
        this.storage.setItem(TokenStorageKeys.AccessTokenExpiration, tokens.expires_in.toString());
        this.storage.setItem(TokenStorageKeys.IdentityToken, tokens.id_token);
        const state = this.getCurrentLocalState();
        this.localStateSubject.next(state);
        return of(state);
    }

    protected getCurrentLocalState() {
        return {
            nonce: this.storage.getItem(TokenStorageKeys.Nonce),
            state: this.storage.getItem(TokenStorageKeys.State),
            codeVerifier: this.storage.getItem(TokenStorageKeys.CodeVerifier),
            authorizationCode: this.storage.getItem(TokenStorageKeys.AuthorizationCode),
            identityToken: this.storage.getItem(TokenStorageKeys.IdentityToken),
            accessToken: this.storage.getItem(TokenStorageKeys.AccessToken),
            accessTokenExpiration: parseInt(this.storage.getItem(TokenStorageKeys.AccessTokenExpiration)),
            preRedirectUrl: this.storage.getItem(TokenStorageKeys.PreRedirectUrl),
        } as LocalState;
    }
}
