import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { EventsService } from 'angular-simple-oidc/events';
import { filterInstanceOf } from 'angular-simple-oidc/operators';
import { AuthService } from '../auth.service';
import { AccessTokenExpiringEvent } from '../auth.events';

@Injectable()
export class ExpiringTokenRefresherDaemonService implements OnDestroy {
  protected readonly destroyedSubject = new Subject();

  constructor(
    protected readonly auth: AuthService,
    protected readonly events: EventsService
  ) {}

  public startDaemon(): void {
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
