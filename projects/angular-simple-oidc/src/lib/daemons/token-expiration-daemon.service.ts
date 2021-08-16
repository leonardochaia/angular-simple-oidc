import { Injectable, OnDestroy } from '@angular/core';
import { merge, of, Subject } from 'rxjs';
import { takeUntil, switchMap, delay } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import {
  AccessTokenExpiredEvent,
  AccessTokenExpiringEvent,
  TokensReadyEvent,
} from '../auth.events';
import { filterInstanceOf } from 'angular-simple-oidc/operators';
import { EventsService, SimpleOidcInfoEvent } from 'angular-simple-oidc/events';

@Injectable()
export class TokenExpirationDaemonService implements OnDestroy {
  protected readonly destroyedSubject = new Subject();

  constructor(
    protected readonly auth: AuthService,
    protected readonly events: EventsService
  ) {}

  public startDaemon(): void {
    this.watchTokenExpiration();
  }

  /**
   * Sets timeouts based on the token expiration.
   * Dispatches AccessTokenExpiringEvent before the access token expires (grace period)
   * Dispatches AccessTokenExpiredEvent when the access token expires.
   */
  public watchTokenExpiration(): void {
    this.auth.events$
      .pipe(
        filterInstanceOf(TokensReadyEvent),
        switchMap(({ payload }) => {
          if (payload.accessToken && payload.accessTokenExpiresAt) {
            const expiration = new Date(payload.accessTokenExpiresAt);

            // TODO: Expose as config?
            const gracePeriod = 60;
            const beforeExpiration = new Date(payload.accessTokenExpiresAt);
            beforeExpiration.setSeconds(
              beforeExpiration.getSeconds() - gracePeriod
            );

            const expiring$ = of(
              new AccessTokenExpiringEvent({
                token: payload.accessToken,
                expiresAt: expiration,
              })
            ).pipe(delay(beforeExpiration));

            const expired$ = of(
              new AccessTokenExpiredEvent({
                token: payload.accessToken,
                expiredAt: expiration,
              })
            ).pipe(delay(expiration));

            return merge(expiring$, expired$);
          } else {
            return of(
              new SimpleOidcInfoEvent(
                'TokenExpired event not configured due to access token or expiration empty.'
              )
            );
          }
        }),
        takeUntil(this.destroyedSubject)
      )
      .subscribe((e) => {
        if (e.payload) {
          e.payload.now = new Date();
        }

        this.events.dispatch(e);
      });
  }

  public ngOnDestroy() {
    this.destroyedSubject.next();
    this.destroyedSubject.complete();
  }
}
