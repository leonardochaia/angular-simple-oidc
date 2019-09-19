import { Injectable, Inject, OnDestroy } from '@angular/core';
import { take, map, tap, withLatestFrom, switchMap, filter, takeUntil } from 'rxjs/operators';
import { TokenUrlService, TokenRequestResult } from 'angular-simple-oidc/core';
import { Subject, Observable, fromEvent, interval } from 'rxjs';
import { EventsService, SimpleOidcInfoEvent } from 'angular-simple-oidc/events';
import { ConfigService } from 'angular-simple-oidc/config';
import { urlJoin } from '../utils/url-join';
import { WINDOW_REF, AUTH_CONFIG_SERVICE } from '../providers';
import { AuthConfig } from '../config/models';
import { OidcCodeFlowClient } from '../oidc-code-flow-client.service';
import { TokenStorageService } from '../token-storage.service';
import { ChildWindowClosedError } from './errors';
import { PopupAuthorizationConfig } from './models';
import { POPUP_AUTHORIZATION_CONFIG_SERVICE } from './providers';

// @dynamic
@Injectable({
    providedIn: 'root'
})
export class AuthorizeEndpointPopupClientService implements OnDestroy {

    protected destroyedSubject = new Subject();

    constructor(
        @Inject(WINDOW_REF)
        protected readonly window: Window,
        protected readonly tokenStorage: TokenStorageService,
        @Inject(AUTH_CONFIG_SERVICE)
        protected readonly authConfig: ConfigService<AuthConfig>,
        @Inject(POPUP_AUTHORIZATION_CONFIG_SERVICE)
        protected readonly popupConfig: ConfigService<PopupAuthorizationConfig>,
        protected readonly events: EventsService,
        protected readonly oidcClient: OidcCodeFlowClient,
        protected readonly tokenUrl: TokenUrlService,
    ) { }

    public startCodeFlowInPopup(options: { height?: number, width?: number } = {}): Observable<TokenRequestResult> {
        const redirectUri$ = this.authConfig.current$
            .pipe(
                withLatestFrom(this.popupConfig.current$),
                map(([authConfig, sessionConfig]) => urlJoin(authConfig.baseUrl, sessionConfig.childWindowPath)),
                take(1),
            );

        return redirectUri$
            .pipe(
                tap(() => this.events.dispatch(new SimpleOidcInfoEvent(`Starting Code Flow in child window`))),
                switchMap((redirectUri) =>
                    this.oidcClient.generateCodeFlowMetadata(redirectUri, null, null, 'popup')
                        .pipe(map(metadata => ({ metadata, redirectUri })))
                ),
                take(1),
                switchMap(({ metadata, redirectUri }) => {
                    this.events.dispatch(new SimpleOidcInfoEvent(`Creating window`, metadata));
                    const handle = this.window.open(metadata.url, '_blank', this.calculatePopupFeatures(options));
                    const handleClosed$ = interval(500)
                        .pipe(
                            tap(() => console.info('polling')),
                            filter(() => handle.closed),
                            tap(() => this.events.dispatch(new SimpleOidcInfoEvent(`Child Window has been closed`))),
                            tap(() => {
                                throw new ChildWindowClosedError({ handle, metadata, redirectUri });
                            }),
                            take(1)
                        );

                    return fromEvent(this.window, 'message')
                        .pipe(
                            map((event: MessageEvent) => ({ event, handle, metadata, redirectUri })),
                            filter(({ event }) => event.data && typeof (event.data) === 'string'),
                            filter(({ event }) => (event.data as string).startsWith(redirectUri)),
                            take(1),
                            takeUntil(handleClosed$),
                        );
                }),
                map(({ event, handle, metadata, redirectUri }) => {
                    const href = event.data;
                    this.events.dispatch(new SimpleOidcInfoEvent(`Obtained data from window`, { event, href }));
                    handle.close();
                    return {
                        href,
                        metadata,
                        redirectUri
                    };
                }),
                switchMap(({ href, redirectUri, metadata }) => this.oidcClient.codeFlowCallback(href, redirectUri, metadata)),
                takeUntil(this.destroyedSubject)
            );
    }

    public ngOnDestroy() {
        this.destroyedSubject.next();
        this.destroyedSubject.complete();
    }

    protected calculatePopupFeatures(options: { height?: number, width?: number }) {
        // Specify an static height and width and calculate centered position
        const height = options.height || 660;
        const width = options.width || 500;
        const screen = this.window.screen;
        const left = (screen.width / 2) - (width / 2);
        const top = (screen.height / 2) - (height / 2);
        return `location=no,toolbar=no,width=${width},height=${height},top=${top},left=${left}`;
    }
}
