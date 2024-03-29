import { LocalState, SimpleOidcError, TokenRequestResult } from 'angular-simple-oidc/core';
import { of, throwError } from 'rxjs';
import { TokenStorageService } from '../token-storage.service';
import { EventsService } from 'angular-simple-oidc/events';
import { SessionChangedEvent, SessionTerminatedEvent } from './events';
import { AuthorizeEndpointSilentClientService } from './authorize-endpoint-silent-client.service';
import { spyOnGet } from '../../../test-utils';
import { SilentFlowDaemonService } from './silent-flow-daemon.service';

describe(SilentFlowDaemonService.name, () => {
    let eventsServiceSpy: jasmine.SpyObj<EventsService>;
    let authorizeSilentClientSpy: jasmine.SpyObj<AuthorizeEndpointSilentClientService>;
    let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;
    let eventsSpy: jasmine.Spy<jasmine.Func>;
    let localStateSpy: jasmine.Spy<jasmine.Func>;

    function buildSilentFlowDaemonService() {
        return new SilentFlowDaemonService(eventsServiceSpy, authorizeSilentClientSpy, tokenStorageSpy);
    }

    beforeEach(() => {
        tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['removeAll']);
        eventsServiceSpy = jasmine.createSpyObj('EventsService', ['dispatch']);
        authorizeSilentClientSpy = jasmine.createSpyObj('AuthorizeEndpointSilentClientService', ['startCodeFlowInIframe']);

        eventsSpy = spyOnGet(eventsServiceSpy, 'events$');
        eventsSpy.and.returnValue(of());

        localStateSpy = spyOnGet(tokenStorageSpy, 'currentState$');
        localStateSpy.and.returnValue(of());

        authorizeSilentClientSpy.startCodeFlowInIframe.and.returnValue(of());
    });

    it('should create', () => {
        expect(buildSilentFlowDaemonService()).toBeTruthy();
    });

    it('should start silent code flow when session changes', () => {
        eventsSpy.and.returnValue(of(new SessionChangedEvent()));
        localStateSpy.and.returnValue(of({}));

        const daemon = buildSilentFlowDaemonService();
        daemon.startDaemon();

        expect(authorizeSilentClientSpy.startCodeFlowInIframe).toHaveBeenCalled();
    });

    it('should terminate session if silent code flow fails', () => {
        eventsSpy.and.returnValue(of(new SessionChangedEvent()));
        localStateSpy.and.returnValue(of({}));

        const expectedError = new SimpleOidcError('Failed', 'failed', {});
        authorizeSilentClientSpy.startCodeFlowInIframe.and.returnValue(throwError(expectedError));

        expect(() => buildSilentFlowDaemonService().startDaemon()).not.toThrow();
        expect(eventsServiceSpy.dispatch).toHaveBeenCalledWith(new SessionTerminatedEvent({ error: {} }));
    });

    it('should terminate session if new token does not belong to user', () => {
        eventsSpy.and.returnValue(of(new SessionChangedEvent()));

        const previousToken = {
            sub: 'foo',
        };

        const newToken = {
            sub: 'bar',
        };

        localStateSpy.and.returnValue(of({
            decodedIdentityToken: previousToken
        } as Partial<LocalState>));

        authorizeSilentClientSpy.startCodeFlowInIframe.and.returnValue(of({
            decodedIdToken: newToken
        } as Partial<TokenRequestResult>));

        expect(() => buildSilentFlowDaemonService().startDaemon()).not.toThrow();
        expect(eventsServiceSpy.dispatch).toHaveBeenCalledWith(new SessionTerminatedEvent({ previousToken, newToken }));
    });

    it('should do nothing if a new valid token is obtained', () => {
        eventsSpy.and.returnValue(of(new SessionChangedEvent()));

        const previousToken = {
            sub: 'foo',
        };

        const newToken = {
            sub: 'foo',
        };

        localStateSpy.and.returnValue(of({
            decodedIdentityToken: previousToken
        } as Partial<LocalState>));

        authorizeSilentClientSpy.startCodeFlowInIframe.and.returnValue(of({
            decodedIdToken: newToken
        } as Partial<TokenRequestResult>));

        expect(() => buildSilentFlowDaemonService().startDaemon()).not.toThrow();
        expect(eventsServiceSpy.dispatch).not.toHaveBeenCalledWith(new SessionTerminatedEvent({ previousToken, newToken }));
    });
});
