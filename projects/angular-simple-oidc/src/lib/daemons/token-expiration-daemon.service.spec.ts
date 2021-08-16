import { fakeAsync, tick, flush } from '@angular/core/testing';
import { AuthService } from '../auth.service';
import {
    TokenRequestResult
} from 'angular-simple-oidc/core';
import { of, Subject } from 'rxjs';
import { TokensReadyEvent, AccessTokenExpiringEvent, AccessTokenExpiredEvent } from '../auth.events';
import { EventsService, SimpleOidcInfoEvent } from 'angular-simple-oidc/events';
import { spyOnGet } from '../../../test-utils';
import { TokenExpirationDaemonService } from './token-expiration-daemon.service';

function getDatePlusSeconds(seconds: number) {
    const now = new Date();
    now.setSeconds(now.getSeconds() + seconds);
    return now;
}

describe(TokenExpirationDaemonService.name, () => {
    let authSpy: jasmine.SpyObj<AuthService>;
    let eventServiceSpy: jasmine.SpyObj<EventsService>;
    let eventsSpy: jasmine.Spy<jasmine.Func>;

    function buildTokenExpirationDaemonService() {
        return new TokenExpirationDaemonService(authSpy, eventServiceSpy);
    }

    beforeEach(() => {
        authSpy = jasmine.createSpyObj('AuthService', ['events$']);
        eventServiceSpy = jasmine.createSpyObj('EventsService', ['dispatch']);

        eventsSpy = spyOnGet(authSpy, 'events$');
    });

    it('should create', () => {
        const daemon = buildTokenExpirationDaemonService();
        expect(daemon).toBeTruthy();
    });

    describe('Token Expiration Events', () => {
        it('should dispatch TokenExpiring before TokenExpired', fakeAsync(() => {
            const tokens: TokenRequestResult = {
                accessToken: 'access-token',
                accessTokenExpiresAt: getDatePlusSeconds(120).getTime()
            };

            eventsSpy.and.returnValue(of(
                new TokensReadyEvent(tokens)
            ));

            const daemon = buildTokenExpirationDaemonService();
            daemon.startDaemon();

            tick(60000);

            const tokenExpiringEvent = new AccessTokenExpiringEvent({
                token: tokens.accessToken,
                expiresAt: new Date(tokens.accessTokenExpiresAt),
                now: new Date()
            });
            expect(eventServiceSpy.dispatch).toHaveBeenCalledWith(tokenExpiringEvent);

            tick(60000);

            const tokenExpiredEvent = new AccessTokenExpiredEvent({
                token: tokens.accessToken,
                expiredAt: new Date(tokens.accessTokenExpiresAt),
                now: new Date()
            });
            expect(eventServiceSpy.dispatch).toHaveBeenCalledWith(tokenExpiredEvent);
        }));

        it('should not configure dispatchers if no access token', fakeAsync(() => {
            const tokens: TokenRequestResult = {};

            eventsSpy.and.returnValue(of(
                new TokensReadyEvent(tokens)
            ));

            const daemon = buildTokenExpirationDaemonService();
            daemon.startDaemon();

            flush();

            expect(eventServiceSpy.dispatch).toHaveBeenCalledWith(
                new SimpleOidcInfoEvent('TokenExpired event not configured due to access token or expiration empty.')
            );
        }));

        it('should unsubscribe when destroyed', fakeAsync(() => {
            const eventsSubject = new Subject<TokensReadyEvent>();
            eventsSpy.and.returnValue(eventsSubject.asObservable());

            const daemon = buildTokenExpirationDaemonService();
            daemon.startDaemon();

            eventsSubject.next(new TokensReadyEvent({}));
            flush();

            expect(eventServiceSpy.dispatch).toHaveBeenCalledTimes(1);

            daemon.ngOnDestroy();

            eventsSubject.next(new TokensReadyEvent({}));
            flush();

            expect(eventServiceSpy.dispatch).toHaveBeenCalledTimes(1);
        }));
    });
});
