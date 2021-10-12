import { of } from 'rxjs';
import { SessionCheckService } from './session-check.service';
import { EventsService } from 'angular-simple-oidc/events';
import { TokensReadyEvent } from '../auth.events';
import { spyOnGet } from '../../../test-utils';
import { SessionCheckDaemonService } from './session-check-daemon.service';

describe(SessionCheckDaemonService.name, () => {
    let sessionCheck: CustomMockObject<SessionCheckService>;
    let eventsServiceSpy: CustomMockObject<EventsService>;
    let eventsSpy: jasmine.Spy<jasmine.Func>;

    function buildSessionCheckDaemonService() {
        return new SessionCheckDaemonService(sessionCheck, eventsServiceSpy);
    }

    beforeEach(() => {
        sessionCheck = {
            'startSessionCheck': jest.fn()
        };
        eventsServiceSpy = {
            'dispatch': jest.fn()
        };

        eventsSpy = spyOnGet(eventsServiceSpy, 'events$');
        eventsSpy.mockReturnValue(of());

        sessionCheck.startSessionCheck.mockReturnValue(of());
    });

    it('should create', () => {
        expect(buildSessionCheckDaemonService()).toBeTruthy();
    });

    it('should start session check after tokens are obtained', () => {
        eventsSpy.mockReturnValue(of(new TokensReadyEvent({} as any)));

        const daemon = buildSessionCheckDaemonService();
        daemon.startDaemon();

        expect(sessionCheck.startSessionCheck).toHaveBeenCalled();
    });
});
