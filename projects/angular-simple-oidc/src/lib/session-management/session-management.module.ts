import { NgModule, OnDestroy } from '@angular/core';
import { EventsService } from '../events/events.service';
import { Subject, of } from 'rxjs';
import { switchMap, takeUntil, tap, catchError, take, map } from 'rxjs/operators';
import { TokensReadyEvent } from '../auth.events';
import { SessionCheckService } from './session-check.service';
import { SessionChangedEvent, SessionTerminatedEvent } from './events';
import { SimpleOidcInfoEvent } from '../events/models';
import { TokenStorageService } from '../token-storage.service';
import { SimpleOidcError } from 'angular-simple-oidc/core';
import { filterInstanceOf } from 'angular-simple-oidc/operators';
import { AuthorizeEndpointSilentClientService } from './authorize-endpoint-silent-client.service';

/**
 * Implements Session Checks according to Session Management
 * https://openid.net/specs/openid-connect-session-1_0.html
 */
@NgModule({
  imports: [],
  providers: [
    SessionCheckService,
    AuthorizeEndpointSilentClientService,
  ],
  declarations: [],
})
export class SessionManagementModule implements OnDestroy {

  protected readonly destroyedSubject = new Subject();

  constructor(
    protected readonly sessionCheck: SessionCheckService,
    protected readonly events: EventsService,
    protected readonly authorizeSilentClient: AuthorizeEndpointSilentClientService,
    protected readonly tokenStorage: TokenStorageService,
  ) {

    const sessionChanged$ = this.events.events$
      .pipe(filterInstanceOf(SessionChangedEvent));

    // Start session checks when we receive tokens.
    this.events.events$
      .pipe(
        filterInstanceOf(TokensReadyEvent),
        switchMap(() => this.sessionCheck.startSessionCheck()),
        takeUntil(this.destroyedSubject),
        takeUntil(sessionChanged$),
      )
      .subscribe();

    // When the RP detects a session state change,
    // it SHOULD first try a prompt=none request within an iframe to obtain
    // a new ID Token and session state, sending the old ID Token as the id_token_hint.
    // If the RP receives an ID token for the same End-User, it SHOULD simply update
    // the value of the session state. If it doesn't receive an ID token or receives
    // an ID token for another End-User, then it needs to handle this case as a
    // logout for the original End-User.
    const silentCodeFlow$ = this.tokenStorage.currentState$
      .pipe(
        take(1),
        switchMap((previousState) => this.authorizeSilentClient.startCodeFlowInIframe()
          .pipe(map(result => ({ result, previousState })))
        ),
        tap(({ result, previousState }) => {
          const newToken = result.decodedIdToken;
          const previousToken = previousState.decodedIdentityToken;
          if (previousToken && newToken.sub !== previousToken.sub) {
            this.events.dispatch(new SessionTerminatedEvent({ previousToken, newToken }));
          }
        }),
        catchError((error: SimpleOidcError) => {
          this.events.dispatch(new SessionTerminatedEvent({ error: error.context }));
          return of(null);
        })
      );

    this.events.events$
      .pipe(
        filterInstanceOf(SessionChangedEvent),
        tap(() => this.events.dispatch(new SimpleOidcInfoEvent('Session has changed. Starting silent code flow.'))),
        switchMap(() => silentCodeFlow$),
        takeUntil(this.destroyedSubject)
      )
      .subscribe();
  }

  public ngOnDestroy() {
    this.destroyedSubject.next();
    this.destroyedSubject.complete();
  }
}
