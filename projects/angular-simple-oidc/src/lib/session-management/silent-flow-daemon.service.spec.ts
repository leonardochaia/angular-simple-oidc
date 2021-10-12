import { LocalState, SimpleOidcError, TokenRequestResult } from 'angular-simple-oidc/core';
import { of, throwError } from 'rxjs';
import { TokenStorageService } from '../token-storage.service';
import { EventsService } from 'angular-simple-oidc/events';
import { SessionChangedEvent, SessionTerminatedEvent } from './events';
import { AuthorizeEndpointSilentClientService } from './authorize-endpoint-silent-client.service';
import { spyOnGet } from '../../../test-utils';
import { SilentFlowDaemonService } from './silent-flow-daemon.service';

describe(SilentFlowDaemonService.name, () => {
    let eventsServiceSpy: CustomMockObject<EventsService>;
    let authorizeSilentClientSpy: CustomMockObject<AuthorizeEndpointSilentClientService>;
    let tokenStorageSpy: CustomMockObject<TokenStorageService>;
    let eventsSpy: jasmine.Spy<jasmine.Func>;
    let localStateSpy: jasmine.Spy<jasmine.Func>;

    function buildSilentFlowDaemonService() {
        return new SilentFlowDaemonService(eventsServiceSpy, authorizeSilentClientSpy, tokenStorageSpy);
    }

    beforeEach(() => {
        tokenStorageSpy = {
            'removeAll': jest.fn()
        };
        eventsServiceSpy = {
            'dispatch': jest.fn()
        };
        authorizeSilentClientSpy = {
            'startCodeFlowInIframe': jest.fn()
        };

        eventsSpy = spyOnGet(eventsServiceSpy, 'events$');
        eventsSpy.mockReturnValue(of());

        localStateSpy = spyOnGet(tokenStorageSpy, 'currentState$');
        localStateSpy.mockReturnValue(of());

        authorizeSilentClientSpy.startCodeFlowInIframe.mockReturnValue(of());
    });

    it('should create', () => {
        expect(buildSilentFlowDaemonService()).toBeTruthy();
    });

    it('should start silent code flow when session changes', () => {
        eventsSpy.mockReturnValue(of(new SessionChangedEvent()));
        localStateSpy.mockReturnValue(of({}));

        const daemon = buildSilentFlowDaemonService();
        daemon.startDaemon();

        expect(authorizeSilentClientSpy.startCodeFlowInIframe).toHaveBeenCalled();
    });

    it('should terminate session if silent code flow fails', () => {
        eventsSpy.mockReturnValue(of(new SessionChangedEvent()));
        localStateSpy.mockReturnValue(of({}));

        const expectedError = new SimpleOidcError('Failed', 'failed', {});
        authorizeSilentClientSpy.startCodeFlowInIframe.mockReturnValue(throwError(expectedError));

        expect(() => buildSilentFlowDaemonService().startDaemon()).not.toThrow();
        expect(eventsServiceSpy.dispatch).toHaveBeenCalledWith(new SessionTerminatedEvent({ error: {} }));
    });

    it('should terminate session if new token does not belong to user', () => {
        eventsSpy.mockReturnValue(of(new SessionChangedEvent()));

        const previousToken = {
            sub: 'foo',
        };

        const newToken = {
            sub: 'bar',
        };

        localStateSpy.mockReturnValue(of({
            decodedIdentityToken: previousToken
        } as Partial<LocalState>));

        authorizeSilentClientSpy.startCodeFlowInIframe.mockReturnValue(of({
            decodedIdToken: newToken
        } as Partial<TokenRequestResult>));

        expect(() => buildSilentFlowDaemonService().startDaemon()).not.toThrow();
        expect(eventsServiceSpy.dispatch).toHaveBeenCalledWith(new SessionTerminatedEvent({ previousToken, newToken }));
    });

    it('should do nothing if a new valid token is obtained', () => {
        eventsSpy.mockReturnValue(of(new SessionChangedEvent()));

        const previousToken = {
            sub: 'foo',
        };

        const newToken = {
            sub: 'foo',
        };

        localStateSpy.mockReturnValue(of({
            decodedIdentityToken: previousToken
        } as Partial<LocalState>));

        authorizeSilentClientSpy.startCodeFlowInIframe.mockReturnValue(of({
            decodedIdToken: newToken
        } as Partial<TokenRequestResult>));

        expect(() => buildSilentFlowDaemonService().startDaemon()).not.toThrow();
        expect(eventsServiceSpy.dispatch).not.toHaveBeenCalledWith(new SessionTerminatedEvent({ previousToken, newToken }));
    });
});
