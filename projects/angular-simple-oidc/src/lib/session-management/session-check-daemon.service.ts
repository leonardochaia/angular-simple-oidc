import { OnDestroy, Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { TokensReadyEvent } from '../auth.events';
import { SessionCheckService } from './session-check.service';
import { SessionChangedEvent } from './events';
import { filterInstanceOf } from 'angular-simple-oidc/operators';
import { EventsService } from 'angular-simple-oidc/events';

@Injectable()
export class SessionCheckDaemonService implements OnDestroy {
  protected readonly destroyedSubject = new Subject();

  constructor(
    protected readonly sessionCheck: SessionCheckService,
    protected readonly events: EventsService,
  ) {
  }

  public startDaemon(): void {
    const sessionChanged$ = this.events.events$
      .pipe(filterInstanceOf(SessionChangedEvent));

    // Start session checks when we receive tokens.
    this.events.events$
      .pipe(
        filterInstanceOf(TokensReadyEvent),
        switchMap(() =>
          this.sessionCheck.startSessionCheck()
            .pipe(takeUntil(sessionChanged$))
        ),
        takeUntil(this.destroyedSubject),
      )
      .subscribe();
  }

  public ngOnDestroy() {
    this.destroyedSubject.next();
    this.destroyedSubject.complete();
  }
}
