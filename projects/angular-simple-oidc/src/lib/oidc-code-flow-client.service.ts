import { Injectable, Inject } from '@angular/core';
import { WINDOW_REF } from './constants';
import { of, throwError, combineLatest } from 'rxjs';
import { tap, switchMap, take, map } from 'rxjs/operators';
import { TokenStorageService } from './token-storage.service';
import { TokenValidationService } from './core/token-validation.service';
import { AuthConfigService } from './config/auth-config.service';
import { urlJoin } from './utils/url-join';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import { TokenUrlService } from './core/token-url.service';
import { ValidationResult } from './core/validation-result';
import { TokenEndpointClientService } from './token-endpoint-client.service';

// @dynamic
@Injectable()
export class OidcCodeFlowClient {

    protected get authConfig() {
        return this.config.configuration;
    }

    constructor(
        @Inject(WINDOW_REF)
        protected readonly window: Window,
        protected readonly config: AuthConfigService,
        protected readonly discoveryDocumentClient: OidcDiscoveryDocClient,
        protected readonly tokenStorage: TokenStorageService,
        protected readonly tokenValidation: TokenValidationService,
        protected readonly tokenUrl: TokenUrlService,
        protected readonly tokenEndpointClient: TokenEndpointClientService,
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
                    }));
                }));
    }

    public codeFlowCallback() {
        const { code, state, error } = this.tokenUrl
            .parseAuthorizeCallbackParamsFromUrl(this.window.location.href);

        if (typeof error === 'string') {
            return throwError(`Identity Provider returned an error after redirection: ${error}`);
        }
        if (typeof code !== 'string' || typeof state !== 'string') {
            return throwError(`Window URL has invalid code or state`);
        }

        return this.tokenStorage.currentState$
            .pipe(
                take(1),
                switchMap(localState => {
                    const codeValidationResult = this.tokenValidation
                        .validateAuthorizeCallback(localState, state, code);
                    if (codeValidationResult !== ValidationResult.noErrors) {
                        return throwError(codeValidationResult);
                    }

                    console.info(`Obtained authorization code: ${code}`);
                    return this.tokenStorage.storeAuthorizationCode(code)
                        .pipe(
                            switchMap((freshState) =>
                                this.requestTokenWithAuthCode(
                                    freshState.authorizationCode,
                                    freshState.codeVerifier)),
                            tap(() => {
                                this.changeUrl(localState.preRedirectUrl);
                            })
                        );
                }),
            );
    }

    protected requestTokenWithAuthCode(
        code: string,
        codeVerifier: string) {

        const payload = this.tokenUrl.createAuthorizationCodeRequestPayload({
            clientId: this.authConfig.clientId,
            clientSecret: this.authConfig.clientSecret,
            scope: this.authConfig.scope,
            redirectUri: this.config.baseUrl,
            code: code,
            codeVerifier: codeVerifier
        });

        return this.tokenEndpointClient.call(payload)
            .pipe(
                switchMap(result => {
                    console.info('Validating identity token..');

                    // For validations, we need the local stored state
                    const localState$ = this.tokenStorage.currentState$
                        .pipe(take(1));

                    // The discovery document for issuer
                    const discoveryDocument$ = this.discoveryDocumentClient.current$
                        .pipe(take(1));

                    // JWT Keys to validate id token signature
                    const jwtKeys$ = this.discoveryDocumentClient.jwtKeys$
                        .pipe(take(1));

                    return combineLatest(localState$, discoveryDocument$, jwtKeys$)
                        .pipe(
                            map(([localState, discoveryDocument, jwtKeys]) => {
                                const validationResult = this.tokenValidation.validateIdToken(
                                    this.authConfig.clientId,
                                    result.idToken,
                                    result.decodedIdToken,
                                    localState.nonce,
                                    discoveryDocument,
                                    jwtKeys,
                                    this.authConfig.tokenValidation);

                                if (!validationResult.success) {
                                    throw validationResult;
                                }

                                return result;
                            }));

                }),
                switchMap(result => {
                    console.info('Validating access token..');
                    const validation = this.tokenValidation
                        .validateAccessToken(result.accessToken, result.decodedIdToken.at_hash);
                    if (!validation.success) {
                        return throwError(validation);
                    }

                    return of(result);
                }),
                tap(() => {
                    console.info('Clearing pre-authorize state..');
                    this.tokenStorage.clearPreAuthorizationState();
                }),
                switchMap(result => {
                    console.info('Storing tokens..');
                    return this.tokenStorage.storeTokens(result)
                        .pipe(map(() => result));
                }),
                switchMap(result => {
                    console.info('Storing original Identity Token..');
                    return this.tokenStorage.storeOriginalIdToken(result.idToken)
                        .pipe(map(() => result));
                }),
            );
    }

    protected changeUrl(url: string) {
        console.info(`Redirecting to ${url}`);
        this.window.location.href = url;
    }
}
