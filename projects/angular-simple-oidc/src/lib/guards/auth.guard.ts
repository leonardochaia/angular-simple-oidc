import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { map, take, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../auth.service';
import { EventsService, SimpleOidcInfoEvent } from 'angular-simple-oidc/events';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(
    protected readonly auth: AuthService,
    protected readonly events: EventsService,
  ) { }

  public canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot) {
    return this.auth.isLoggedIn$
      .pipe(
        take(1),
        switchMap(authenticated => {
          if (!authenticated) {
            this.events.dispatch(new SimpleOidcInfoEvent(`Route requires auth. No token or it's expired.`,
              { route: state.url }));
            return this.auth.startCodeFlow()
              // return false so that route change does not happen
              .pipe(map(() => false));
          }

          return of(true);
        })
      );
  }
}
