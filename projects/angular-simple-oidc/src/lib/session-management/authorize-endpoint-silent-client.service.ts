import { Injectable, Inject } from '@angular/core';
import { OidcDiscoveryDocClient } from '../discovery-document/oidc-discovery-doc-client.service';
import { DynamicIframeService } from '../dynamic-iframe/dynamic-iframe.service';
import { take, map, tap, switchMap, filter, timeout, catchError } from 'rxjs/operators';
import { AuthConfigService } from '../config/auth-config.service';
import { TokenStorageService } from '../token-storage.service';
import { fromEvent, throwError, Observable } from 'rxjs';
import { WINDOW_REF } from '../constants';
import { EventsService } from '../events/events.service';
import { TokenUrlService, TokenRequestResult } from 'angular-simple-oidc/core';
import { SimpleOidcInfoEvent } from '../events/models';
import { urlJoin } from '../utils/url-join';
import { switchTap } from 'angular-simple-oidc/operators';
import { OidcCodeFlowClient } from '../oidc-code-flow-client.service';
import { IframePostMessageTimeoutError } from './errors';

// @dynamic
@Injectable()
export class AuthorizeEndpointSilentClientService {

    protected get authConfig() {
        return this.config.configuration;
    }

    constructor(
        @Inject(WINDOW_REF)
        protected readonly window: Window,
        protected readonly discoveryClient: OidcDiscoveryDocClient,
        protected readonly dynamicIframe: DynamicIframeService,
        protected readonly tokenStorage: TokenStorageService,
        protected readonly config: AuthConfigService,
        protected readonly events: EventsService,
        protected readonly oidcClient: OidcCodeFlowClient,
        protected readonly tokenUrl: TokenUrlService,
    ) { }

    public startCodeFlowInIframe(): Observable<TokenRequestResult> {
        // TODO: Configuration
        const iframeUrl = urlJoin(this.config.baseUrl, 'assets/oidc-iframe.html');
        const iframeTimeout = 10 * 1000;
        return this.tokenStorage.currentState$
            .pipe(
                take(1),
                tap(() => this.events.dispatch(new SimpleOidcInfoEvent(`Starting Code Flow in iframe`))),
                switchMap(({ identityToken }) => this.oidcClient.generateCodeFlowMetadata(iframeUrl, identityToken, 'none')),
                switchMap(metadata => {
                    this.events.dispatch(new SimpleOidcInfoEvent(`Creating iframe`, metadata));
                    const iframe = this.dynamicIframe
                        .create()
                        .hide()
                        .setSource(metadata.url)
                        .appendToBody();

                    return fromEvent(this.window, 'message')
                        .pipe(
                            map((event: MessageEvent) => ({ event, iframe, metadata })),
                            filter(({ event }) => (event.data as string).startsWith(iframeUrl)),
                            take(1),
                            timeout(iframeTimeout),
                            catchError(e => {
                                if (e.name && e.name === 'TimeoutError') {
                                    throw new IframePostMessageTimeoutError({
                                        iframe,
                                        e,
                                    });
                                } else {
                                    return throwError(e);
                                }
                            })
                        );
                }),
                map(({ event, iframe, metadata }) => {
                    const href = event.data;
                    this.events.dispatch(new SimpleOidcInfoEvent(`Obtained data from iframe`, { event, href }));
                    iframe.remove();

                    const params = this.oidcClient.parseCodeFlowCallbackParams(href);
                    this.oidcClient.validateCodeFlowCallback(params, metadata.state);

                    return {
                        ...params, metadata
                    };
                }),
                switchTap(({ code, sessionState }) => this.tokenStorage.storeAuthorizationCode(code, sessionState)),
                switchMap(({ code, metadata }) => {
                    const payload = this.tokenUrl.createAuthorizationCodeRequestPayload({
                        clientId: this.authConfig.clientId,
                        clientSecret: this.authConfig.clientSecret,
                        scope: this.authConfig.scope,
                        redirectUri: iframeUrl,
                        code: code,
                        codeVerifier: metadata.codeVerifier,
                    });

                    return this.oidcClient.requestTokenWithAuthCode(payload, metadata.nonce);
                })
            );
    }
}
