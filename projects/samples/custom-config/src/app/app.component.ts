import { Component, OnDestroy, Inject } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService, AuthConfig, AUTH_CONFIG_SERVICE, SESSION_MANAGEMENT_CONFIG_SERVICE } from 'angular-simple-oidc';
import { SimpleOidcInfoEvent } from 'angular-simple-oidc/events';
import { ConfigService } from 'angular-simple-oidc/config';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {

  protected readonly destroyedSubject = new Subject();

  public get authConfig$() {
    return this.authConfig.current$;
  }

  public get sessionConfig$() {
    return this.sessionConfig.current$;
  }

  constructor(
    private readonly auth: AuthService,
    @Inject(AUTH_CONFIG_SERVICE)
    private readonly authConfig: ConfigService<AuthConfig>,
    @Inject(SESSION_MANAGEMENT_CONFIG_SERVICE)
    private readonly sessionConfig: ConfigService<AuthConfig>) {

    this.auth.events$
      .pipe(takeUntil(this.destroyedSubject))
      .subscribe(e => {
        if (e instanceof SimpleOidcInfoEvent) {
          console.log(e.message);
          console.table(e.payload);
        } else {
          console.log(e);
        }
      });

    this.auth.errors$
      .pipe(takeUntil(this.destroyedSubject))
      .subscribe(e => {
        console.error(e);
      });
  }

  public ngOnDestroy() {
    this.destroyedSubject.next();
    this.destroyedSubject.complete();
  }
}
