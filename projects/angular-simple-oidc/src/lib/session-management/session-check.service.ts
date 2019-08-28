import { Injectable, OnDestroy, Inject } from '@angular/core';
import { OidcDiscoveryDocClient } from '../discovery-document/oidc-discovery-doc-client.service';
import { DynamicIframeService } from '../dynamic-iframe/dynamic-iframe.service';
import { take, map, tap, switchMap, takeUntil, filter, finalize } from 'rxjs/operators';
import { SessionCheckNotSupportedError, SessionCheckFailedError } from './errors';
import { AuthConfigService } from '../config/auth-config.service';
import { TokenStorageService } from '../token-storage.service';
import { DynamicIframe } from '../dynamic-iframe/dynamic-iframe';
import { interval, fromEvent, Subject, combineLatest } from 'rxjs';
import { WINDOW_REF } from '../constants';
import { EventsService } from '../events/events.service';
import { SessionChangedEvent } from './events';
import { LocalState } from 'angular-simple-oidc/core';
import { SimpleOidcInfoEvent } from '../events/models';

// @dynamic
@Injectable()
export class SessionCheckService implements OnDestroy {

    protected destroyedSubject = new Subject();

    protected get expectedIframeOrigin() {
        return new URL(this.config.configuration.openIDProviderUrl).origin;
    }

    constructor(
        @Inject(WINDOW_REF)
        protected readonly window: Window,
        protected readonly discoveryClient: OidcDiscoveryDocClient,
        protected readonly dynamicIframe: DynamicIframeService,
        protected readonly tokenStorage: TokenStorageService,
        protected readonly config: AuthConfigService,
        protected readonly events: EventsService,
    ) { }

    public ngOnDestroy() {
        this.destroyedSubject.next();
        this.destroyedSubject.complete();
    }

    public startSessionCheck() {
        // TODO: Configuration
        const opIframePollTime = 1 * 1000;
        const localState$ = this.tokenStorage.currentState$
            .pipe(take(1));

        const doc$ = this.discoveryClient.current$
            .pipe(take(1));

        const iframe = this.dynamicIframe
            .create()
            .hide();

        return combineLatest(doc$, localState$)
            .pipe(
                take(1),
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
                switchMap(localState => {
                    const pollIframe$ = interval(opIframePollTime)
                        .pipe(
                            tap(() => this.checkSession(iframe, localState)),
                        );

                    const listen$ = fromEvent(this.window, 'message')
                        .pipe(
                            filter((e: MessageEvent) => e.origin === this.expectedIframeOrigin),
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

    protected checkSession(iframe: DynamicIframe, state: LocalState) {
        const msg = `${this.config.configuration.clientId.toLowerCase()} ${state.sessionState}`;
        iframe.postMessage(msg, this.expectedIframeOrigin);
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
