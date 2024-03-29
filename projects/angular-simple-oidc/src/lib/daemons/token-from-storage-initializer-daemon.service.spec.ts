import { TokenStorageService } from '../token-storage.service';
import {
    TokenHelperService,
    LocalState,
} from 'angular-simple-oidc/core';
import { of } from 'rxjs';
import { TokensReadyEvent } from '../auth.events';
import { EventsService, SimpleOidcInfoEvent } from 'angular-simple-oidc/events';
import { spyOnGet } from '../../../test-utils';
import { TokenFromStorageInitializerDaemonService } from './token-from-storage-initializer-daemon.service';
import { fakeAsync, tick } from '@angular/core/testing';


describe(TokenFromStorageInitializerDaemonService.name, () => {
    let eventServiceSpy: jasmine.SpyObj<EventsService>;
    let storageSpy: jasmine.SpyObj<TokenStorageService>;
    let helperSpy: jasmine.SpyObj<TokenHelperService>;
    let currentStateSpy: jasmine.Spy<jasmine.Func>;

    function buildTokenFromStorageInitializerDaemon() {
        return new TokenFromStorageInitializerDaemonService(eventServiceSpy, storageSpy, helperSpy);
    }

    beforeEach(() => {
        eventServiceSpy = jasmine.createSpyObj('EventsService', ['dispatch']);
        storageSpy = jasmine.createSpyObj('TokenStorageService', ['currentState$']);
        helperSpy = jasmine.createSpyObj('TokenHelperService', ['isTokenExpired']);

        currentStateSpy = spyOnGet(storageSpy, 'currentState$');
    });

    it('should create', () => {
        const daemon = buildTokenFromStorageInitializerDaemon();
        expect(daemon).toBeTruthy();
    });

    describe('Token Initialization', () => {
        it('should request tokens from the store on construction', () => {
            currentStateSpy.and.returnValue(of());

            const daemon = buildTokenFromStorageInitializerDaemon();
            daemon.startDaemon();

            expect(daemon).toBeTruthy();
            expect(currentStateSpy).toHaveBeenCalledTimes(1);
        });

        it('should dispatch TokensReady if valid tokens on construction', fakeAsync(() => {
            const state: Partial<LocalState> = {
                accessToken: 'access-token',
                accessTokenExpiration: 123
            };
            currentStateSpy.and.returnValue(of(state));
            helperSpy.isTokenExpired.and.returnValue(false);

            const tokenReadyEvent = new TokensReadyEvent({
                accessToken: state.accessToken,
                accessTokenExpiresAt: state.accessTokenExpiration,
                decodedIdToken: state.decodedIdentityToken,
                idToken: state.identityToken,
                refreshToken: state.refreshToken,
            });

            const daemon = buildTokenFromStorageInitializerDaemon();
            daemon.startDaemon();

            tick();
            expect(eventServiceSpy.dispatch).toHaveBeenCalledWith(tokenReadyEvent);
        }));

        it('should dispatch InfoEvent if token expired on construction', fakeAsync(() => {
            const state: Partial<LocalState> = {
                accessToken: 'access-token',
                accessTokenExpiration: 123
            };
            currentStateSpy.and.returnValue(of(state));

            helperSpy.isTokenExpired.and.returnValue(true);

            const infoEvent = new SimpleOidcInfoEvent('Found token in storage but it\'s expired');

            const daemon = buildTokenFromStorageInitializerDaemon();
            daemon.startDaemon();

            tick();
            expect(eventServiceSpy.dispatch).toHaveBeenCalledWith(infoEvent);
        }));
    });
});
