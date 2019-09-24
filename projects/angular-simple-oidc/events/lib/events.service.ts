import { Injectable } from '@angular/core';
import { SimpleOidcEvent, SimpleOidcErrorEvent } from './models';
import { ReplaySubject } from 'rxjs';
import { SimpleOidcError } from 'angular-simple-oidc/core';

@Injectable({
    providedIn: 'root'
})
export class EventsService {

    public get events$() {
        return this.eventSubject.asObservable();
    }

    public get errors$() {
        return this.errorSubject.asObservable();
    }

    protected readonly eventSubject = new ReplaySubject<SimpleOidcEvent>(5);
    protected readonly errorSubject = new ReplaySubject<SimpleOidcErrorEvent>(5);

    public dispatch<TEvent extends SimpleOidcEvent>(ev: TEvent) {
        this.eventSubject.next(ev);
    }

    public dispatchError(e: SimpleOidcError) {
        this.errorSubject.next(new SimpleOidcErrorEvent(e));
    }
}
