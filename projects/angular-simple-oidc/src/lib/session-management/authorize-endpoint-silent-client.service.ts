import { Injectable, Inject } from '@angular/core';
import { OidcDiscoveryDocClient } from '../discovery-document/oidc-discovery-doc-client.service';
import { DynamicIframeService } from '../dynamic-iframe/dynamic-iframe.service';
import { take, map, tap, switchMap, filter, timeout, catchError, withLatestFrom } from 'rxjs/operators';
import { TokenStorageService } from '../token-storage.service';
import { fromEvent, throwError, Observable } from 'rxjs';
import { WINDOW_REF, AUTH_CONFIG_SERVICE } from '../providers';
import { TokenUrlService, TokenRequestResult } from 'angular-simple-oidc/core';
import { urlJoin } from '../utils/url-join';
import { OidcCodeFlowClient } from '../oidc-code-flow-client.service';
import { IframePostMessageTimeoutError } from './errors';
import { ConfigService } from 'angular-simple-oidc/config';
import { AuthConfig } from '../config/models';
import { SESSION_MANAGEMENT_CONFIG_SERVICE } from './providers';
import { SessionManagementConfig } from './models';
import { EventsService, SimpleOidcInfoEvent } from 'angular-simple-oidc/events';

// @dynamic
@Injectable()
export class AuthorizeEndpointSilentClientService {

    constructor(
        @Inject(WINDOW_REF)
        protected readonly window: Window,
        protected readonly discoveryClient: OidcDiscoveryDocClient,
        protected readonly dynamicIframe: DynamicIframeService,
        protected readonly tokenStorage: TokenStorageService,
        @Inject(AUTH_CONFIG_SERVICE)
        protected readonly authConfig: ConfigService<AuthConfig>,
        @Inject(SESSION_MANAGEMENT_CONFIG_SERVICE)
        protected readonly sessionConfig: ConfigService<SessionManagementConfig>,
        protected readonly events: EventsService,
        protected readonly oidcClient: OidcCodeFlowClient,
        protected readonly tokenUrl: TokenUrlService,
    ) { }

    public startCodeFlowInIframe(): Observable<TokenRequestResult> {
        const iframeUrl$ = this.authConfig.current$
            .pipe(
                withLatestFrom(this.sessionConfig.current$),
                map(([authConfig, sessionConfig]) => urlJoin(authConfig.baseUrl, sessionConfig.iframePath))
            );

        return this.tokenStorage.currentState$
            .pipe(
                take(1),
                tap(() => this.events.dispatch(new SimpleOidcInfoEvent(`Starting Code Flow in iframe`))),
                withLatestFrom(iframeUrl$),
                switchMap(([{ identityToken }, iframeUrl]) =>
                    this.oidcClient.generateCodeFlowMetadata({
                        redirectUri: iframeUrl,
                        prompt: 'none',
                        idTokenHint: identityToken
                    }).pipe(
                        map(metadata => ({ metadata, iframeUrl }))
                    )
                ),
                withLatestFrom(this.sessionConfig.current$),
                take(1),
                switchMap(([{ metadata, iframeUrl }, sessionConfig]) => {
                    this.events.dispatch(new SimpleOidcInfoEvent(`Creating iframe`, metadata));
                    const iframe = this.dynamicIframe
                        .create()
                        .hide()
                        .setSource(metadata.url)
                        .appendToBody();

                    return fromEvent(this.window, 'message')
                        .pipe(
                            map((event: MessageEvent) => ({ event, iframe, metadata, iframeUrl })),
                            filter(({ event }) => (event.data as string).startsWith(iframeUrl)),
                            take(1),
                            timeout(sessionConfig.iframeTimeout),
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
                map(({ event, iframe, metadata, iframeUrl }) => {
                    const href = event.data;
                    this.events.dispatch(new SimpleOidcInfoEvent(`Obtained data from iframe`, { event, href }));
                    iframe.remove();

                    return {
                        href,
                        iframeUrl,
                        metadata
                    };
                }),
                switchMap(({ href, iframeUrl, metadata }) => this.oidcClient.codeFlowCallback(href, iframeUrl, metadata))
            );
    }
}
