import { fakeAsync, tick, flush } from '@angular/core/testing';
import { TokenEventsModule } from './token-events.module';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import {
    TokenHelperService,
    LocalState,
    TokenRequestResult
} from 'angular-simple-oidc/core';
import { of, Subject } from 'rxjs';
import { TokensReadyEvent, AccessTokenExpiringEvent, AccessTokenExpiredEvent } from './auth.events';
import { EventsService, SimpleOidcInfoEvent } from 'angular-simple-oidc/events';

function spyOnGet<T>(obj: T, property: keyof T) {
    Object.defineProperty(obj, property, { get: () => null });
    return spyOnProperty(obj, property, 'get');
}

function getDatePlusSeconds(seconds: number) {
    const now = new Date();
    now.setSeconds(now.getSeconds() + seconds);
    return now;
}

describe('TokenEventsModule', () => {
    let authSpy: jasmine.SpyObj<AuthService>;
    let eventServiceSpy: jasmine.SpyObj<EventsService>;
    let storageSpy: jasmine.SpyObj<TokenStorageService>;
    let helperSpy: jasmine.SpyObj<TokenHelperService>;
    let eventsSpy: jasmine.Spy<InferableFunction>;
    let currentStateSpy: jasmine.Spy<InferableFunction>;

    function createEventsModule() {
        return new TokenEventsModule(authSpy, eventServiceSpy, storageSpy, helperSpy);
    }

    beforeEach(() => {
        authSpy = jasmine.createSpyObj('AuthService', ['events$']);
        eventServiceSpy = jasmine.createSpyObj('EventsService', ['dispatch']);
        storageSpy = jasmine.createSpyObj('TokenStorageService', ['currentState$']);
        helperSpy = jasmine.createSpyObj('TokenHelperService', ['isTokenExpired']);

        eventsSpy = spyOnGet(authSpy, 'events$');
        currentStateSpy = spyOnGet(storageSpy, 'currentState$');

    });

    it('should create', () => {
        currentStateSpy.and.returnValue(of());
        eventsSpy.and.returnValue(of());

        const mod = createEventsModule();

        expect(mod).toBeTruthy();
    });

    describe('Token Initialization', () => {

        it('should request tokens from the store on construction', () => {
            currentStateSpy.and.returnValue(of());
            eventsSpy.and.returnValue(of());

            const mod = createEventsModule();

            expect(mod).toBeTruthy();
            expect(currentStateSpy).toHaveBeenCalledTimes(1);
        });

        it('should dispatch TokensReady if valid tokens on construction', () => {
            const state: Partial<LocalState> = {
                accessToken: 'access-token',
                accessTokenExpiration: 123
            };
            currentStateSpy.and.returnValue(of(state));
            eventsSpy.and.returnValue(of());

            helperSpy.isTokenExpired.and.returnValue(false);

            const expected = new TokensReadyEvent({
                accessToken: state.accessToken,
                accessTokenExpiresAt: state.accessTokenExpiration,
                decodedIdToken: state.decodedIdentityToken,
                idToken: state.identityToken,
                refreshToken: state.refreshToken,
            });

            createEventsModule();
            expect(eventServiceSpy.dispatch).toHaveBeenCalledWith(expected);
        });

        it('should dispatch InfoEvent if token expired on construction', () => {
            const state: Partial<LocalState> = {
                accessToken: 'access-token',
                accessTokenExpiration: 123
            };
            currentStateSpy.and.returnValue(of(state));
            eventsSpy.and.returnValue(of());

            helperSpy.isTokenExpired.and.returnValue(true);

            const expected = new SimpleOidcInfoEvent('Have token in storage but is expired');

            createEventsModule();
            expect(eventServiceSpy.dispatch).toHaveBeenCalledWith(expected);
        });
    });

    describe('Token Expiration Events', () => {
        it('should dispatch TokenExpiring before TokenExpired', fakeAsync(() => {
            const state: Partial<LocalState> = {};
            currentStateSpy.and.returnValue(of(state));
            const tokens: TokenRequestResult = {
                accessToken: 'access-token',
                accessTokenExpiresAt: getDatePlusSeconds(120).getTime()
            };

            eventsSpy.and.returnValue(of(
                new TokensReadyEvent(tokens)
            ));

            createEventsModule();
            tick(60000);
            const expected1 = new AccessTokenExpiringEvent({
                token: tokens.accessToken,
                expiresAt: new Date(tokens.accessTokenExpiresAt),
                now: new Date()
            });
            expect(eventServiceSpy.dispatch).toHaveBeenCalledWith(expected1);

            tick(60000);
            const expected2 = new AccessTokenExpiredEvent({
                token: tokens.accessToken,
                expiredAt: new Date(tokens.accessTokenExpiresAt),
                now: new Date()
            });
            expect(eventServiceSpy.dispatch).toHaveBeenCalledWith(expected2);
        }));

        it('should not configure dispatchers if no access token', fakeAsync(() => {
            const state: Partial<LocalState> = {};
            currentStateSpy.and.returnValue(of(state));
            const tokens: TokenRequestResult = {};

            eventsSpy.and.returnValue(of(
                new TokensReadyEvent(tokens)
            ));

            createEventsModule();
            flush();
            expect(eventServiceSpy.dispatch).toHaveBeenCalledWith(
                new SimpleOidcInfoEvent('TokenExpired event not configured due to access token or expiration empty.'));
        }));

        it('should unsubscribe when destroyed', fakeAsync(() => {
            currentStateSpy.and.returnValue(of());

            const subject = new Subject<TokensReadyEvent>();

            eventsSpy.and.returnValue(subject.asObservable());

            const mod = createEventsModule();

            subject.next(new TokensReadyEvent({}));
            flush();
            expect(eventServiceSpy.dispatch).toHaveBeenCalledTimes(1);

            mod.ngOnDestroy();

            subject.next(new TokensReadyEvent({}));
            flush();
            expect(eventServiceSpy.dispatch).toHaveBeenCalledTimes(1);
        }));
    });
});
