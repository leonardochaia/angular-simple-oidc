import { Component, OnDestroy } from '@angular/core';
import {
  AuthService,
  TokensReadyEvent
} from 'angular-simple-oidc';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { SimpleOidcError } from 'angular-simple-oidc/core';

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
      .pipe(takeUntil(this.destroyedSubject))
      .subscribe(e => {
        if (e instanceof TokensReadyEvent) {
          console.info(`Tokens! Yummy.`);
          console.log(
            JSON.stringify(e.payload, null, 4)
          );
        } else {
          console.log(e);
        }
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
