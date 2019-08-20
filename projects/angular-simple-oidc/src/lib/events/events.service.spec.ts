import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { EventsService } from './events.service';
import { SimpleOidcEvent, SimpleOidcInfoEvent, SimpleOidcErrorEvent } from './models';
import { SimpleOidcError } from 'angular-simple-oidc/core';

describe('EventsService', () => {
  let events: EventsService;

  beforeEach(() => {

    TestBed.configureTestingModule({
      providers: [
        EventsService
      ],
    });

    events = TestBed.get(EventsService);
  });

  it('should create', () => {
    expect(events).toBeTruthy();
  });

  describe('events$', () => {

    it('emits on the events$ when dispatching', fakeAsync(() => {

      const info0 = new SimpleOidcInfoEvent('0');
      const info1 = new SimpleOidcInfoEvent('1');

      const output: SimpleOidcEvent[] = [];
      events.events$.subscribe(e => output.push(e));

      events.dispatch(info0);
      events.dispatch(info1);
      flush();

      expect(output[0]).toBe(info0);
      expect(output[1]).toBe(info1);
    }));

    it('emits all events when subscribing', fakeAsync(() => {

      const info0 = new SimpleOidcInfoEvent('0');
      const info1 = new SimpleOidcInfoEvent('1');

      events.dispatch(info0);
      events.dispatch(info1);

      const output: SimpleOidcEvent[] = [];
      events.events$.subscribe(e => output.push(e));

      flush();

      expect(output[0]).toBe(info0);
      expect(output[1]).toBe(info1);
    }));

    it('doesn\'t emit errors in the events$ observable', fakeAsync(() => {

      const info0 = new SimpleOidcInfoEvent('0');
      const info1 = new SimpleOidcInfoEvent('1');
      const error0 = new SimpleOidcError('error0', 'e0', null);

      events.dispatch(info0);
      events.dispatch(info1);
      events.dispatchError(error0);

      const output: SimpleOidcEvent[] = [];
      events.events$.subscribe(e => output.push(e));

      flush();

      expect(output[0]).toBe(info0);
      expect(output[1]).toBe(info1);
      expect(output[2]).toBeUndefined();
    }));

  });

  describe('errors$', () => {

    it('emits on the errors$ when dispatching errors', fakeAsync(() => {

      const error0 = new SimpleOidcError('0', '0', null);
      const error1 = new SimpleOidcError('1', '1', null);

      const output: SimpleOidcErrorEvent[] = [];
      events.errors$.subscribe(e => output.push(e));

      events.dispatchError(error0);
      events.dispatchError(error1);
      flush();

      expect(output[0]).toEqual(new SimpleOidcErrorEvent(error0));
      expect(output[1]).toEqual(new SimpleOidcErrorEvent(error1));
    }));

    it('emits all errors when subscribing', fakeAsync(() => {

      const error0 = new SimpleOidcError('0', '0', null);
      const error1 = new SimpleOidcError('1', '1', null);

      events.dispatchError(error0);
      events.dispatchError(error1);

      const output: SimpleOidcErrorEvent[] = [];
      events.errors$.subscribe(e => output.push(e));

      flush();

      expect(output[0]).toEqual(new SimpleOidcErrorEvent(error0));
      expect(output[1]).toEqual(new SimpleOidcErrorEvent(error1));
    }));

  });
});
