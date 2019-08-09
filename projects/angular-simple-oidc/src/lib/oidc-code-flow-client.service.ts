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
import { EventsService } from './events/events.service';
import { SimpleOidcInfoEvent } from './events/models';

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
    ) { }

    public startCodeFlow() {
        this.events.dispatch(new SimpleOidcInfoEvent(`Starting Code Flow`));
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

    public codeFlowCallback() {
        this.events.dispatch(new SimpleOidcInfoEvent(`Starting Code Flow callback`));

        let code: string, state: string, error: string;
        const href = this.window.location.href;

        this.events.dispatch(new SimpleOidcInfoEvent(`Parsing params from URL`, href));
        try {
            const result = this.tokenUrl.parseAuthorizeCallbackParamsFromUrl(href);
            code = result.code;
            state = result.state;
            error = result.error;
        } catch (error) {
            throw new AuthorizationCallbackFormatError(error);
        }

        this.events.dispatch(new SimpleOidcInfoEvent(`Validating URL params`,
            { code, state, error, href }));
        this.tokenValidation.validateAuthorizeCallbackFormat(code, state, error, href);

        return this.tokenStorage.currentState$
            .pipe(
                take(1),
                switchMap(localState => {
                    this.events.dispatch(new SimpleOidcInfoEvent(`Validating state vs local state`,
                        { localState, state }));

                    this.tokenValidation.validateAuthorizeCallbackState(localState, state);

                    this.events.dispatch(new SimpleOidcInfoEvent(`Obtained authorization code.`,
                        { code, state }));

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

        this.events.dispatch(new SimpleOidcInfoEvent(`Requesting token using authorization code`,
            { code, codeVerifier }));

        const payload = this.tokenUrl.createAuthorizationCodeRequestPayload({
            clientId: this.authConfig.clientId,
            clientSecret: this.authConfig.clientSecret,
            scope: this.authConfig.scope,
            redirectUri: this.config.baseUrl,
            code: code,
            codeVerifier: codeVerifier
        });

        this.events.dispatch(new SimpleOidcInfoEvent(`Token Endpoint payload generated`, payload));

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

                    this.events.dispatch(new SimpleOidcInfoEvent('Validating identity token..', {
                        result, localState, discoveryDocument, jwtKeys
                    }));

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
                    this.events.dispatch(new SimpleOidcInfoEvent('Validating access token..', result));
                    this.tokenValidation.validateAccessToken(result.accessToken,
                        result.decodedIdToken.at_hash);
                }),
                tap(() => {
                    this.events.dispatch(new SimpleOidcInfoEvent('Clearing pre-authorize state..'));
                    this.tokenStorage.clearPreAuthorizationState();
                }),
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
            );
    }

    protected changeUrl(url: string) {
        this.events.dispatch(new SimpleOidcInfoEvent(`Redirecting to ${url}`));
        this.window.location.href = url;
    }
}
