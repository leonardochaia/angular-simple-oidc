import { Injectable, Inject } from '@angular/core';
import { WINDOW_REF } from './constants';
import { tap, switchMap, take, map, withLatestFrom } from 'rxjs/operators';
import { TokenStorageService } from './token-storage.service';
import {
    TokenValidationService,
    TokenUrlService,
    AuthorizationCallbackFormatError,
    LocalState,
    TokenRequestResult,
} from 'angular-simple-oidc/core';
import { AuthConfigService } from './config/auth-config.service';
import { urlJoin } from './utils/url-join';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import { TokenEndpointClientService } from './token-endpoint-client.service';
import { EventsService } from './events/events.service';
import { SimpleOidcInfoEvent } from './events/models';
import { TokensValidatedEvent, TokensReadyEvent } from './auth.events';
import { Observable } from 'rxjs';
import { DynamicIframeService } from './dynamic-iframe/dynamic-iframe.service';
import { switchTap } from './utils/switch-tap';

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
        protected readonly events: EventsService,
        protected readonly dynamicIframe: DynamicIframeService
    ) { }

    public startCodeFlow(): Observable<LocalState> {
        const redirectUri = urlJoin(this.config.baseUrl, this.authConfig.tokenCallbackRoute);
        return this.generateCodeFlowMetadata(redirectUri)
            .pipe(
                tap(() => this.events.dispatch(new SimpleOidcInfoEvent(`Starting Code Flow`))),
                switchMap((result) => {

                    this.events.dispatch(new SimpleOidcInfoEvent(`Authorize URL generated`, result));

                    return this.tokenStorage.storePreAuthorizationState({
                        nonce: result.nonce,
                        state: result.state,
                        codeVerifier: result.codeVerifier,
                        preRedirectUrl: this.window.location.href
                    }).pipe(tap((state) => {
                        this.events.dispatch(new SimpleOidcInfoEvent(`Pre-authorize state stored`, state));
                        this.changeUrl(result.url);
                    }));
                }));
    }

    public generateCodeFlowMetadata(redirectUri: string, idTokenHint?: string, prompt?: string) {
        return this.discoveryDocumentClient.current$
            .pipe(
                take(1),
                map((discoveryDocument) => {
                    return this.tokenUrl.createAuthorizeUrl(
                        discoveryDocument.authorization_endpoint, {
                            clientId: this.authConfig.clientId,
                            scope: this.authConfig.scope,
                            responseType: 'code',
                            redirectUri,
                            idTokenHint,
                            prompt
                        });
                })
            );
    }

    public parseCodeFlowCallbackParams(href: string) {
        try {
            const result = this.tokenUrl.parseAuthorizeCallbackParamsFromUrl(href);
            return { ...result, href };
        } catch (error) {
            throw new AuthorizationCallbackFormatError(error);
        }
    }

    public validateCodeFlowCallback(
        params: { href: string, code: string, state: string, error: string },
        localState: string) {

        const { href, code, state, error } = params;

        this.events.dispatch(new SimpleOidcInfoEvent(`Validating URL params`,
            { code, state, error, href }));
        this.tokenValidation.validateAuthorizeCallbackFormat(code, state, error, href);

        this.events.dispatch(new SimpleOidcInfoEvent(`Validating state vs local state`,
            { localState, state }));

        this.tokenValidation.validateAuthorizeCallbackState(localState, state);

        this.events.dispatch(new SimpleOidcInfoEvent(`Obtained authorization code.`,
            { code, state }));
    }

    public codeFlowCallback(): Observable<TokenRequestResult> {

        return this.tokenStorage.currentState$
            .pipe(
                tap(() => this.events.dispatch(new SimpleOidcInfoEvent(`Starting Code Flow callback`))),
                take(1),
                map(localState => {
                    const params = this.parseCodeFlowCallbackParams(this.window.location.href);
                    this.validateCodeFlowCallback(params, localState.state);

                    const payload = this.tokenUrl.createAuthorizationCodeRequestPayload({
                        clientId: this.authConfig.clientId,
                        clientSecret: this.authConfig.clientSecret,
                        scope: this.authConfig.scope,
                        redirectUri: this.config.baseUrl,
                        code: params.code,
                        codeVerifier: localState.codeVerifier
                    });

                    return { params, payload, localState };
                }),
                switchTap(({ params }) => this.tokenStorage.storeAuthorizationCode(params.code, params.sessionState)),
                switchMap(({ payload, localState }) => this.requestTokenWithAuthCode(payload, localState.nonce).pipe(
                    tap(() => this.changeUrl(localState.preRedirectUrl))
                )),
            );
    }

    public requestTokenWithAuthCode(payload: string, nonce: string) {

        // The discovery document for issuer
        const discoveryDocument$ = this.discoveryDocumentClient.current$
            .pipe(take(1));

        // JWT Keys to validate id token signature
        const jwtKeys$ = this.discoveryDocumentClient.jwtKeys$
            .pipe(take(1));

        return this.tokenEndpointClient.call(payload)
            .pipe(
                tap(() => this.events.dispatch(new SimpleOidcInfoEvent(`Requesting token using authorization code`, payload))),
                withLatestFrom(discoveryDocument$, jwtKeys$),
                tap(([result, discoveryDocument, jwtKeys]) => {

                    this.events.dispatch(new SimpleOidcInfoEvent('Validating identity token..', {
                        result, nonce, discoveryDocument, jwtKeys
                    }));

                    this.tokenValidation.validateIdToken(
                        this.authConfig.clientId,
                        result.idToken,
                        result.decodedIdToken,
                        nonce,
                        discoveryDocument,
                        jwtKeys,
                        this.authConfig.tokenValidation);
                }),
                tap(([result]) => {
                    this.events.dispatch(new SimpleOidcInfoEvent('Validating access token..', result));
                    this.tokenValidation.validateAccessToken(result.accessToken,
                        result.decodedIdToken.at_hash);
                }),
                switchMap((r) => {
                    this.events.dispatch(new SimpleOidcInfoEvent('Clearing pre-authorize state..'));
                    return this.tokenStorage.clearPreAuthorizationState()
                        .pipe(map(() => r));
                }),
                tap(([result]) => this.events.dispatch(new TokensValidatedEvent(result))),
                switchMap(([result]) => {
                    this.events.dispatch(new SimpleOidcInfoEvent('Storing tokens..', result));
                    return this.tokenStorage.storeTokens(result)
                        .pipe(map(() => result));
                }),
                switchMap(result => {
                    this.events.dispatch(new SimpleOidcInfoEvent('Storing original Identity Token..', result.idToken));
                    return this.tokenStorage.storeOriginalIdToken(result.idToken)
                        .pipe(map(() => result));
                }),
                tap((result) => this.events.dispatch(new TokensReadyEvent(result))),
            );
    }

    protected changeUrl(url: string) {
        this.events.dispatch(new SimpleOidcInfoEvent(`Redirecting`, url));
        this.window.location.href = url;
    }
}
