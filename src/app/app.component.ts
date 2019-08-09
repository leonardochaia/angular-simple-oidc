import { Component } from '@angular/core';
import { AuthService } from 'angular-simple-oidc';
import { pipe } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SimpleOidcErrorEvent } from 'angular-simple-oidc/lib/events/models';
import { SimpleOidcError } from 'angular-simple-oidc/lib/core/errors';

@Component({
  selector: 'soidc-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  public oidcErrors: SimpleOidcError[] = [];

  constructor(readonly auth: AuthService) {
    auth.events$
      .pipe(filter(e => e instanceof SimpleOidcErrorEvent))
      .subscribe((e: SimpleOidcErrorEvent) => {

        console.log(e);
        this.oidcErrors.push(e.error);
      });
  }
}
