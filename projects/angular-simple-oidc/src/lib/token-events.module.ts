import { NgModule, OnDestroy } from '@angular/core';
import { AuthService } from './auth.service';
import { filter, takeUntil, delay, switchMap, take } from 'rxjs/operators';
import { TokensReadyEvent, AccessTokenExpiredEvent, AccessTokenExpiringEvent } from './auth.events';
import { Subject, of, merge } from 'rxjs';
import { EventsService } from './events/events.service';
import { SimpleOidcInfoEvent } from './events/models';
import { TokenStorageService } from './token-storage.service';
import { TokenHelperService } from 'angular-simple-oidc/core';

@NgModule({
  imports: [],
  providers: [],
  declarations: [],
})
export class TokenEventsModule implements OnDestroy {

  protected readonly destroyedSubject = new Subject();

  constructor(
    protected readonly auth: AuthService,
    protected readonly events: EventsService,
    protected readonly storage: TokenStorageService,
    protected readonly tokenHelper: TokenHelperService,
  ) {

    // Initialize memory with persisted storage.
    storage.currentState$
      .pipe(take(1))
      .subscribe(state => {
        if (state.accessToken || state.identityToken || state.refreshToken) {
          if (!tokenHelper.isTokenExpired(state.accessTokenExpiration)) {
            this.events.dispatch(new TokensReadyEvent({
              accessToken: state.accessToken,
              accessTokenExpiresAt: state.accessTokenExpiration,
              decodedIdToken: state.decodedIdentityToken,
              idToken: state.identityToken,
              refreshToken: state.refreshToken,
            }));
          } else {
            this.events.dispatch(new SimpleOidcInfoEvent('Have token in storage but is expired'));
          }
        }
      });

    this.watchTokenExpiration();
  }

  /**
   * Sets timeouts based on the token expiration.
   * Dispatches AccessTokenExpiringEvent before the access token expires (grace period)
   * Dispatches AccessTokenExpiredEvent when the access token expires.
   */
  public watchTokenExpiration() {
    this.auth.events$
      .pipe(
        filter((e): e is TokensReadyEvent => e instanceof TokensReadyEvent),
        switchMap(({ payload }) => {
          if (payload.accessToken && payload.accessTokenExpiresAt) {

            const expiration = new Date(payload.accessTokenExpiresAt);

            // TODO: Expose as config?
            const gracePeriod = 60;
            const beforeExpiration = new Date(payload.accessTokenExpiresAt);
            beforeExpiration.setSeconds(beforeExpiration.getSeconds() - gracePeriod);

            const expiring$ = of(new AccessTokenExpiringEvent({
              token: payload.accessToken,
              expiresAt: expiration
            })).pipe(
              delay(beforeExpiration)
            );

            const expired$ = of(new AccessTokenExpiredEvent({
              token: payload.accessToken,
              expiredAt: expiration
            })).pipe(
              delay(expiration)
            );

            return merge(expiring$, expired$);
          } else {
            return of(new SimpleOidcInfoEvent('TokenExpired event not configured due to access token or expiration empty.'));
          }
        }),
        takeUntil(this.destroyedSubject),
      ).subscribe(e => {
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
