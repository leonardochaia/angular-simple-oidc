import { of } from 'rxjs';
import { SessionCheckService } from './session-check.service';
import { EventsService } from 'angular-simple-oidc/events';
import { TokensReadyEvent } from '../auth.events';
import { spyOnGet } from '../../../test-utils';
import { SessionCheckDaemonService } from './session-check-daemon.service';

describe(SessionCheckDaemonService.name, () => {
    let sessionCheck: jasmine.SpyObj<SessionCheckService>;
    let eventsServiceSpy: jasmine.SpyObj<EventsService>;
    let eventsSpy: jasmine.Spy<jasmine.Func>;

    function buildSessionCheckDaemonService() {
        return new SessionCheckDaemonService(sessionCheck, eventsServiceSpy);
    }

    beforeEach(() => {
        sessionCheck = jasmine.createSpyObj('SessionCheckService', ['startSessionCheck']);
        eventsServiceSpy = jasmine.createSpyObj('EventsService', ['dispatch']);

        eventsSpy = spyOnGet(eventsServiceSpy, 'events$');
        eventsSpy.and.returnValue(of());

        sessionCheck.startSessionCheck.and.returnValue(of());
    });

    it('should create', () => {
        expect(buildSessionCheckDaemonService()).toBeTruthy();
    });

    it('should start session check after tokens are obtained', () => {
        eventsSpy.and.returnValue(of(new TokensReadyEvent({} as any)));

        const daemon = buildSessionCheckDaemonService();
        daemon.startDaemon();

        expect(sessionCheck.startSessionCheck).toHaveBeenCalled();
    });
});
