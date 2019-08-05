import { Injectable, Inject } from '@angular/core';
import { HttpParams, HttpClient, HttpHeaders } from '@angular/common/http';
import { WINDOW_REF } from '../constants';
import { of, BehaviorSubject, combineLatest, throwError } from 'rxjs';
import { tap, switchMap, take } from 'rxjs/operators';
import { TokenEndpointResponse, LocalState } from './models';
import { TokenStorageService } from './token-storage.service';
import { TokenValidationService } from './token-validation.service';
import { AuthConfigService } from '../config/auth-config.service';
import { urlJoin } from '../utils/url-join';
import { OidcDiscoveryDocClient } from '../discovery-document/oidc-discovery-doc-client.service';
import { TokenUrlService } from './token-url.service';
import { ValidationResult } from './validation-result';
import { TokenHelperService } from './token-helper.service';

// @dynamic
@Injectable()
export class OidcCodeFlowClient {

    public get codeFlowResults$() {
        return this.codeFlowResultsSubject.asObservable();
    }

    protected readonly codeFlowResultsSubject = new BehaviorSubject<TokenEndpointResponse>(null);

    protected get authConfig() {
        return this.config.configuration;
    }

    constructor(
        @Inject(WINDOW_REF)
        protected readonly window: Window,
        protected readonly http: HttpClient,
        protected readonly config: AuthConfigService,
        protected readonly discoveryDocumentClient: OidcDiscoveryDocClient,
        protected readonly tokenStorage: TokenStorageService,
        protected readonly tokenValidation: TokenValidationService,
        protected readonly tokenUrl: TokenUrlService,
        protected readonly tokenHelper: TokenHelperService,
    ) { }

    public startCodeFlow() {
        return this.discoveryDocumentClient.current$
            .pipe(
                take(1),
                switchMap((discoveryDocument) => {
                    const result = this.tokenUrl.createAuthorizeUrl(
                        discoveryDocument.authorization_endpoint, {
                            clientId: this.authConfig.clientId,
                            scope: this.authConfig.scope,
                            responseType: 'code',
                            redirectUri: urlJoin(this.config.baseUrl, this.authConfig.tokenCallbackRoute)
                        });
                    return this.tokenStorage.storePreAuthorizationState({
                        nonce: result.nonce,
                        state: result.state,
                        codeVerifier: result.codeVerifier,
                        preRedirectUrl: this.window.location.href
                    }).pipe(tap(() => {
                        this.changeUrl(result.url);
                        // return from(new Promise(() => {
                        //     // will never be resolved.
                        // }));
                    }));
                }));
    }

    public codeFlowCallback() {
        const { code, state, error } = this.tokenUrl
            .parseAuthorizeCallbackParamsFromUrl(this.window.location.href);

        if (typeof error === 'string')
            return throwError(`Identity Provider returned an error after redirection: ${error}`);

        if (typeof code !== 'string' || typeof state !== 'string') {
            return throwError(`Window URL has invalid code or state`);
        }

        const localState$ = this.tokenStorage.currentState$.pipe(take(1));
        const discoveryDocument$ = this.discoveryDocumentClient.current$.pipe(take(1));
        return combineLatest(localState$, discoveryDocument$)
            .pipe(
                switchMap(([localState, discoveryDocument]) => {
                    const codeValidationResult = this.tokenValidation
                        .validateAuthorizeCallback(localState, state, code);
                    if (codeValidationResult != ValidationResult.NoErrors) {
                        return throwError(codeValidationResult);
                    }

                    console.info(`Obtained authorization code: ${code}`);
                    return this.tokenStorage.storeAuthorizationCode(code)
                        .pipe(
                            switchMap((freshState) => this.requestToken(freshState,
                                discoveryDocument.token_endpoint)),
                            tap(result => {
                                this.codeFlowResultsSubject.next(result);
                                this.changeUrl(localState.preRedirectUrl);
                            })
                        );
                }),
            );
    }

    protected requestToken(localState: LocalState, tokenEndpointUrl: string) {
        if (!localState.authorizationCode) {
            throw new Error(`Expected authorization code to be in sotrage`);
        }

        const payload = this.tokenUrl.createTokenRequestPayload({
            clientId: this.authConfig.clientId,
            clientSecret: this.authConfig.clientSecret,
            scope: this.authConfig.scope,
            redirectUri: this.config.baseUrl,
            grantType: 'authorization_code',
            code: localState.authorizationCode,
            codeVerifier: localState.codeVerifier
        });

        const headers: HttpHeaders = new HttpHeaders()
            .set('Content-Type', 'application/x-www-form-urlencoded');

        return this.http.post(tokenEndpointUrl, payload, { headers: headers })
            .pipe(
                switchMap((response: TokenEndpointResponse) => {
                    console.info(`Token request succeed
                    AccessToken: ${response.access_token}
                    AccessTokenExpiresIn: ${response.expires_in} seconds
                    AccessTokenExpiresAt: ${this.tokenHelper.getExpirationFromExpiresIn(response.expires_in)}
                    IdentityToken: ${response.id_token}`);

                    if (response.error) {
                        throw new Error(response.error);
                    } else {
                        return this.tokenValidation.validateIdToken(response.id_token, response.access_token)
                            .pipe(
                                tap(() => this.tokenStorage.clearPreAuthorizationState()),
                                switchMap(validationResult => {
                                    if (validationResult.success) {
                                        console.info('Token validation succeeded. Persisting tokens.');
                                        this.tokenStorage.storeTokens(response);
                                        return of(response);
                                    } else {
                                        throw new Error(validationResult.message);
                                    }
                                }));
                    }
                })
            );
    }

    protected changeUrl(url: string) {
        console.info(`Redirecting to ${url}`);
        this.window.location.href = url;
    }
}
