import { Injectable, Inject } from '@angular/core';
import {
    TokenStorageKeys, LocalState,
    TokenRequestResult, DecodedIdentityToken
} from './models';
import { of, BehaviorSubject } from 'rxjs';
import { LOCAL_STORAGE_REF } from '../constants';

// @dynamic
@Injectable()
export class TokenStorageService {

    public get currentState$() {
        return this.localStateSubject.asObservable();
    }

    protected get storage() {
        return this.localStorage;
    }

    protected readonly localStateSubject = new BehaviorSubject<LocalState>(this.getCurrentLocalState());

    constructor(
        @Inject(LOCAL_STORAGE_REF)
        private readonly localStorage: Storage
    ) { }

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

    public storeOriginalIdToken(idToken: string) {
        this.storage.setItem(TokenStorageKeys.OriginalIdentityToken, idToken);
        const state = this.getCurrentLocalState();
        this.localStateSubject.next(state);
        return of(state);
    }

    public storeTokens(tokens: TokenRequestResult) {
        this.storage.setItem(TokenStorageKeys.IdentityToken, tokens.idToken);
        this.storeJSON(TokenStorageKeys.IdentityTokenDecoded, tokens.decodedIdToken);

        this.storage.setItem(TokenStorageKeys.AccessToken, tokens.accessToken);
        if (tokens.accessTokenExpiresAt) {
            this.storage.setItem(TokenStorageKeys.AccessTokenExpiration,
                tokens.accessTokenExpiresAt.toString());
        }

        if (tokens.refreshToken) {
            this.storage.setItem(TokenStorageKeys.RefreshToken, tokens.refreshToken);
        }

        const state = this.getCurrentLocalState();
        this.localStateSubject.next(state);
        return of(state);
    }

    protected getCurrentLocalState() {
        const state: LocalState = {
            nonce: this.storage.getItem(TokenStorageKeys.Nonce),
            state: this.storage.getItem(TokenStorageKeys.State),
            codeVerifier: this.storage.getItem(TokenStorageKeys.CodeVerifier),
            authorizationCode: this.storage.getItem(TokenStorageKeys.AuthorizationCode),
            identityToken: this.storage.getItem(TokenStorageKeys.IdentityToken),
            originalIdentityToken: this.storage.getItem(TokenStorageKeys.OriginalIdentityToken),
            accessToken: this.storage.getItem(TokenStorageKeys.AccessToken),
            accessTokenExpiration: parseInt(this.storage.getItem(TokenStorageKeys.AccessTokenExpiration), 10),
            refreshToken: this.storage.getItem(TokenStorageKeys.RefreshToken),
            preRedirectUrl: this.storage.getItem(TokenStorageKeys.PreRedirectUrl),
            decodedIdentityToken: this.readJSON<DecodedIdentityToken>(TokenStorageKeys.IdentityTokenDecoded)
        };
        return state;
    }

    protected storeJSON<T>(key: string, obj: T) {
        this.storage.setItem(key, JSON.stringify(obj));
    }

    protected readJSON<T>(key: string) {
        const json = this.storage.getItem(key);
        return json ? JSON.parse(json) as T : null;
    }
}
