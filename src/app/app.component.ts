import { Component, OnDestroy } from '@angular/core';
import {
  AuthService,
  TokensReadyEvent,
  SessionTerminatedEvent
} from 'angular-simple-oidc';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { SimpleOidcError } from 'angular-simple-oidc/core';
import { filterInstanceOf, } from 'angular-simple-oidc/operators';

@Component({
  selector: 'soidc-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {

  public oidcErrors: SimpleOidcError[] = [];

  protected readonly destroyedSubject = new Subject();

  constructor(readonly auth: AuthService) {

    auth.events$
      .pipe(
        filterInstanceOf(TokensReadyEvent),
        takeUntil(this.destroyedSubject)
      )
      .subscribe(e => {
        console.info(`Tokens! Yummy.`);
        console.log(
          JSON.stringify(e.payload.decodedIdToken, null, 4)
        );
      });

    auth.events$
      .pipe(
        filterInstanceOf(SessionTerminatedEvent),
        takeUntil(this.destroyedSubject)
      )
      .subscribe(e => {
        alert('Your session has ended!');
      });

    auth.events$
      .pipe(takeUntil(this.destroyedSubject))
      .subscribe(e => {
        console.log(e);
      });

    auth.errors$
      .pipe(takeUntil(this.destroyedSubject))
      .subscribe(e => {
        console.error(e);
        this.oidcErrors.push(e.error);
      });
  }

  public ngOnDestroy() {
    this.destroyedSubject.next();
    this.destroyedSubject.complete();
  }
}
