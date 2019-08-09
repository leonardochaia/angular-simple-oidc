import { Injectable, Inject } from '@angular/core';
import { WINDOW_REF } from './constants';
import { tap, switchMap, take, map, withLatestFrom } from 'rxjs/operators';
import { TokenStorageService } from './token-storage.service';
import { TokenValidationService } from './core/token-validation.service';
import { AuthConfigService } from './config/auth-config.service';
import { urlJoin } from './utils/url-join';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import { TokenUrlService } from './core/token-url.service';
import { TokenEndpointClientService } from './token-endpoint-client.service';
import { AuthorizationCallbackFormatError } from './core/token-validation-errors';

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
        let code: string, state: string, error: string;
        const href = this.window.location.href;

        try {
            const result = this.tokenUrl.parseAuthorizeCallbackParamsFromUrl(href);
            code = result.code;
            state = result.state;
            error = result.error;
        } catch (error) {
            throw new AuthorizationCallbackFormatError(error);
        }

        this.tokenValidation.validateAuthorizeCallbackFormat(code, state, error, href);

        return this.tokenStorage.currentState$
            .pipe(
                take(1),
                switchMap(localState => {
                    this.tokenValidation.validateAuthorizeCallbackState(localState, state);

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

        // For validations, we need the local stored state
        const localState$ = this.tokenStorage.currentState$
            .pipe(take(1));

        // The discovery document for issuer
        const discoveryDocument$ = this.discoveryDocumentClient.current$
            .pipe(take(1));

        // JWT Keys to validate id token signature
        const jwtKeys$ = this.discoveryDocumentClient.jwtKeys$
            .pipe(take(1));

        return this.tokenEndpointClient.call(payload)
            .pipe(
                withLatestFrom(localState$, discoveryDocument$, jwtKeys$),
                tap(([result, localState, discoveryDocument, jwtKeys]) => {
                    console.info('Validating identity token..');
                    this.tokenValidation.validateIdToken(
                        this.authConfig.clientId,
                        result.idToken,
                        result.decodedIdToken,
                        localState.nonce,
                        discoveryDocument,
                        jwtKeys,
                        this.authConfig.tokenValidation);
                }),
                tap(([result]) => {
                    console.info('Validating access token..');
                    this.tokenValidation.validateAccessToken(result.accessToken,
                        result.decodedIdToken.at_hash);
                }),
                tap(() => {
                    console.info('Clearing pre-authorize state..');
                    this.tokenStorage.clearPreAuthorizationState();
                }),
                switchMap(([result]) => {
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
