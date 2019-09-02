import { NgModule, OnDestroy } from '@angular/core';
import { AuthService } from './auth.service';
import { takeUntil, switchMap } from 'rxjs/operators';
import { AccessTokenExpiringEvent } from './auth.events';
import { Subject } from 'rxjs';
import { EventsService } from 'angular-simple-oidc/events';
import { filterInstanceOf } from 'angular-simple-oidc/operators';

@NgModule({
  imports: [],
  providers: [],
  declarations: [],
})
export class AutomaticRefreshModule implements OnDestroy {

  protected readonly destroyedSubject = new Subject();

  constructor(
    protected readonly auth: AuthService,
    protected readonly events: EventsService,
  ) {

    this.auth.events$
      .pipe(
        filterInstanceOf(AccessTokenExpiringEvent),
        switchMap(() => this.auth.refreshAccessToken()),
        takeUntil(this.destroyedSubject)
      )
      .subscribe();
  }

  public ngOnDestroy() {
    this.destroyedSubject.next();
    this.destroyedSubject.complete();
  }
}
