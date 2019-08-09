import { Injectable } from '@angular/core';
import { SimpleOidcEvent, SimpleOidcErrorEvent } from './models';
import { ReplaySubject } from 'rxjs';
import { SimpleOidcError } from '../core/errors';
import { filter, map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class EventsService {

    public get events$() {
        return this.eventSubject.asObservable();
    }

    public get errors$() {
        return this.events$
            .pipe(
                filter(e => e instanceof SimpleOidcErrorEvent),
                map(e => e as SimpleOidcErrorEvent)
            );
    }

    protected readonly eventSubject = new ReplaySubject<SimpleOidcEvent>();

    public dispatch<TEvent extends SimpleOidcEvent>(ev: TEvent) {
        this.eventSubject.next(ev);
    }

    public dispatchError(e: SimpleOidcError) {
        this.dispatch(new SimpleOidcErrorEvent(e));
    }
}
