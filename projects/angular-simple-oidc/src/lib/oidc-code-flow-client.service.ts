import { Injectable, Inject } from '@angular/core';
import { WINDOW_REF, AUTH_CONFIG_SERVICE } from './providers';
import { tap, switchMap, take, map, withLatestFrom } from 'rxjs/operators';
import { TokenStorageService } from './token-storage.service';
import {
    TokenValidationService,
    TokenUrlService,
    AuthorizationCallbackFormatError,
    LocalState,
    TokenRequestResult,
} from 'angular-simple-oidc/core';
import { urlJoin } from './utils/url-join';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import { TokenEndpointClientService } from './token-endpoint-client.service';
import { TokensValidatedEvent, TokensReadyEvent } from './auth.events';
import { Observable } from 'rxjs';
import { DynamicIframeService } from './dynamic-iframe/dynamic-iframe.service';
import { switchTap } from 'angular-simple-oidc/operators';
import { ConfigService } from 'angular-simple-oidc/config';
import { AuthConfig } from './config/models';
import { EventsService, SimpleOidcInfoEvent } from 'angular-simple-oidc/events';

// @dynamic
@Injectable()
export class OidcCodeFlowClient {

    constructor(
        @Inject(WINDOW_REF)
        protected readonly window: Window,
        @Inject(AUTH_CONFIG_SERVICE)
        protected readonly config: ConfigService<AuthConfig>,
        protected readonly discoveryDocumentClient: OidcDiscoveryDocClient,
        protected readonly tokenStorage: TokenStorageService,
        protected readonly tokenValidation: TokenValidationService,
        protected readonly tokenUrl: TokenUrlService,
        protected readonly tokenEndpointClient: TokenEndpointClientService,
        protected readonly events: EventsService,
        protected readonly dynamicIframe: DynamicIframeService
    ) { }

    public startCodeFlow(): Observable<LocalState> {
        return this.config.current$
            .pipe(
                map(config => urlJoin(config.baseUrl, config.tokenCallbackRoute)),
                switchMap(redirectUri => this.generateCodeFlowMetadata(redirectUri)),
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
                }),
                take(1)
            );
    }

    public generateCodeFlowMetadata(redirectUri: string, idTokenHint?: string, prompt?: string) {
        return this.discoveryDocumentClient.current$
            .pipe(
                withLatestFrom(this.config.current$),
                map(([discoveryDocument, config]) => this.tokenUrl.createAuthorizeUrl(
                    discoveryDocument.authorization_endpoint, {
                        clientId: config.clientId,
                        scope: config.scope,
                        responseType: 'code',
                        redirectUri,
                        idTokenHint,
                        prompt
                    })
                ),
                take(1),
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
                take(1),
                tap(() => this.events.dispatch(new SimpleOidcInfoEvent(`Starting Code Flow callback`))),
                withLatestFrom(this.config.current$),
                map(([localState, config]) => {
                    const params = this.parseCodeFlowCallbackParams(this.window.location.href);
                    this.validateCodeFlowCallback(params, localState.state);

                    const payload = this.tokenUrl.createAuthorizationCodeRequestPayload({
                        clientId: config.clientId,
                        clientSecret: config.clientSecret,
                        scope: config.scope,
                        redirectUri: config.baseUrl,
                        code: params.code,
                        codeVerifier: localState.codeVerifier
                    });

                    return { params, payload, localState };
                }),
                switchTap(({ params }) => this.tokenStorage.storeAuthorizationCode(params.code, params.sessionState)),
                switchMap(({ payload, localState }) => this.requestTokenWithAuthCode(payload, localState.nonce).pipe(
                    tap(() => this.changeUrl(localState.preRedirectUrl))
                )),
                take(1),
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
                withLatestFrom(discoveryDocument$, jwtKeys$, this.config.current$),
                take(1),
                tap(([result, discoveryDocument, jwtKeys, config]) => {

                    this.events.dispatch(new SimpleOidcInfoEvent('Validating identity token..', {
                        result, nonce, discoveryDocument, jwtKeys
                    }));

                    this.tokenValidation.validateIdToken(
                        config.clientId,
                        result.idToken,
                        result.decodedIdToken,
                        nonce,
                        discoveryDocument,
                        jwtKeys,
                        config.tokenValidation);
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
