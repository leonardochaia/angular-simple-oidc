import { Component, OnDestroy } from '@angular/core';
import { AuthService } from 'angular-simple-oidc';
import { takeUntil } from 'rxjs/operators';
import { SimpleOidcError } from 'angular-simple-oidc/lib/core/errors';
import { Subject } from 'rxjs';

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
