import { Injectable, OnDestroy } from '@angular/core';
import {  Subject } from 'rxjs';
import { takeUntil,  take } from 'rxjs/operators';
import {
  TokensReadyEvent,
} from '../auth.events';
import { TokenHelperService } from 'angular-simple-oidc/core';
import { EventsService, SimpleOidcInfoEvent } from 'angular-simple-oidc/events';
import { TokenStorageService } from '../token-storage.service';

@Injectable()
export class TokenFromStorageInitializerDaemonService implements OnDestroy {
  protected readonly destroyedSubject = new Subject();

  constructor(
    protected readonly events: EventsService,
    protected readonly storage: TokenStorageService,
    protected readonly tokenHelper: TokenHelperService
  ) {}

  public startDaemon(): void {
    this.loadTokenFromStorage();
  }

  public async loadTokenFromStorage(): Promise<void> {
    const currentState = await this.storage.currentState$
      .pipe(take(1), takeUntil(this.destroyedSubject))
      .toPromise();

    if (
      !currentState.accessToken &&
      !currentState.identityToken &&
      !currentState.refreshToken
    ) {
      return;
    }

    if (!this.tokenHelper.isTokenExpired(currentState.accessTokenExpiration)) {
      this.events.dispatch(
        new TokensReadyEvent({
          accessToken: currentState.accessToken,
          accessTokenExpiresAt: currentState.accessTokenExpiration,
          decodedIdToken: currentState.decodedIdentityToken,
          idToken: currentState.identityToken,
          refreshToken: currentState.refreshToken,
        })
      );
    } else {
      this.events.dispatch(
        new SimpleOidcInfoEvent('Found token in storage but it\'s expired')
      );
    }
  }

  public ngOnDestroy() {
    this.destroyedSubject.next();
    this.destroyedSubject.complete();
  }
}
