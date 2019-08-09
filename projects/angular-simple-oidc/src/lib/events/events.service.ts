import { Injectable } from '@angular/core';
import { SimpleOidcEvent, SimpleOidcErrorEvent } from './models';
import { ReplaySubject } from 'rxjs';
import { SimpleOidcError } from '../core/errors';

@Injectable({
    providedIn: 'root'
})
export class EventsService {

    public get events$() {
        return this.subject.asObservable();
    }

    protected readonly subject = new ReplaySubject<SimpleOidcEvent>();

    public dispatch<TEvent extends SimpleOidcEvent>(ev: TEvent) {
        this.subject.next(ev);
    }

    public dispatchError(e: SimpleOidcError) {
        this.dispatch(new SimpleOidcErrorEvent(e));
    }
}
