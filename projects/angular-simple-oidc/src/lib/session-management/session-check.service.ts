import { Injectable, OnDestroy, Inject } from '@angular/core';
import { OidcDiscoveryDocClient } from '../discovery-document/oidc-discovery-doc-client.service';
import { DynamicIframeService } from '../dynamic-iframe/dynamic-iframe.service';
import { take, map, tap, switchMap, takeUntil, filter, finalize, withLatestFrom } from 'rxjs/operators';
import { SessionCheckNotSupportedError, SessionCheckFailedError } from './errors';
import { TokenStorageService } from '../token-storage.service';
import { DynamicIframe } from '../dynamic-iframe/dynamic-iframe';
import { interval, fromEvent, Subject, combineLatest } from 'rxjs';
import { WINDOW_REF, AUTH_CONFIG_SERVICE } from '../providers';
import { SessionChangedEvent } from './events';
import { LocalState } from 'angular-simple-oidc/core';
import { SessionManagementConfig } from './models';
import { SESSION_MANAGEMENT_CONFIG_SERVICE } from './providers';
import { ConfigService } from 'angular-simple-oidc/config';
import { AuthConfig } from '../config/models';
import { EventsService, SimpleOidcInfoEvent } from 'angular-simple-oidc/events';

// @dynamic
@Injectable()
export class SessionCheckService implements OnDestroy {

    protected destroyedSubject = new Subject();

    constructor(
        @Inject(WINDOW_REF)
        protected readonly window: Window,
        protected readonly discoveryClient: OidcDiscoveryDocClient,
        protected readonly dynamicIframe: DynamicIframeService,
        protected readonly tokenStorage: TokenStorageService,
        @Inject(AUTH_CONFIG_SERVICE)
        protected readonly config: ConfigService<AuthConfig>,
        @Inject(SESSION_MANAGEMENT_CONFIG_SERVICE)
        protected readonly sessionConfig: ConfigService<SessionManagementConfig>,
        protected readonly events: EventsService,
    ) { }

    public ngOnDestroy() {
        this.destroyedSubject.next();
        this.destroyedSubject.complete();
    }

    public startSessionCheck() {
        const localState$ = this.tokenStorage.currentState$
            .pipe(take(1));

        const doc$ = this.discoveryClient.current$
            .pipe(take(1));

        const iframe = this.dynamicIframe
            .create()
            .hide();

        return combineLatest(doc$, localState$)
            .pipe(
                tap(() => this.events.dispatch(new SimpleOidcInfoEvent('Starting Session Check'))),
                map(([doc, localState]) => {
                    if (!doc.check_session_iframe || !localState.sessionState) {
                        throw new SessionCheckNotSupportedError({ doc, localState });
                    } else {
                        iframe.setSource(doc.check_session_iframe)
                            .appendToBody();
                        return localState;
                    }
                }),
                withLatestFrom(this.config.current$, this.sessionConfig.current$),
                take(1),
                switchMap(([localState, authConfig, sessionConfig]) => {

                    const expectedIframeOrigin = new URL(authConfig.openIDProviderUrl).origin;

                    const pollIframe$ = interval(sessionConfig.opIframePollInterval)
                        .pipe(
                            map(() => `${authConfig.clientId.toLowerCase()} ${localState.sessionState}`),
                            tap(msg => iframe.postMessage(msg, expectedIframeOrigin)),
                        );

                    const listen$ = fromEvent(this.window, 'message')
                        .pipe(
                            filter((e: MessageEvent) => e.origin === expectedIframeOrigin),
                            map((e: MessageEvent) => this.fireEventsFromMessage(e)),
                            filter(msg => !!msg)  // only the messages we care
                        );

                    return combineLatest(pollIframe$, listen$)
                        .pipe(
                            map((arr) => arr[1]), // just keep the message response and drop the interval
                        );
                }),
                finalize(() => iframe.remove()),
                takeUntil(this.destroyedSubject.asObservable()),
            );
    }

    /**
     * The received data will either be changed or unchanged
     * unless the syntax of the message sent was determined by the OP to be malformed,
     * in which case the received data will be error.
     * @param msg
     */
    protected fireEventsFromMessage(msg: MessageEvent) {
        const result = msg.data as string;
        switch (result) {
            case 'changed':
                this.events.dispatch(new SessionChangedEvent());
                return result;
            case 'unchanged':
                return result;
            case 'error':
                throw new SessionCheckFailedError(msg);
            default:
                // If the message is not the one we expect, ignore it.
                return null;
        }
    }
}
