import { fakeAsync, tick, flush } from '@angular/core/testing';
import { AuthService } from '../auth.service';
import {
    TokenRequestResult
} from 'angular-simple-oidc/core';
import { Observable, of, Subject } from 'rxjs';
import { TokensReadyEvent, AccessTokenExpiringEvent, AccessTokenExpiredEvent } from '../auth.events';
import { EventsService, SimpleOidcInfoEvent } from 'angular-simple-oidc/events';
import { TokenExpirationDaemonService } from './token-expiration-daemon.service';

function getDatePlusSeconds(seconds: number) {
    const now = new Date();
    now.setSeconds(now.getSeconds() + seconds);
    return now;
}

describe(TokenExpirationDaemonService.name, () => {
    let authSpy: jest.Mocked<AuthService>;
    let eventServiceSpy: jest.Mocked<EventsService>;
    let eventsSpy: jest.Mock;

    function buildTokenExpirationDaemonService() {
        return new TokenExpirationDaemonService(authSpy, eventServiceSpy);
    }

    beforeEach(() => {
        eventsSpy = jest.fn();
        authSpy = {
            'events$': eventsSpy
        } as any;
        eventServiceSpy = {
            'dispatch': jest.fn() as any
        } as any
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

            eventsSpy.mockReturnValue(of(
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

            eventsSpy.mockReturnValue(of(
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
            eventsSpy.mockReturnValue(eventsSubject.asObservable());

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
