import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { map, take, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(private readonly auth: AuthService) { }

  public canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot) {
    return this.auth.isLoggedIn$
      .pipe(
        take(1),
        switchMap(authenticated => {
          if (!authenticated) {
            console.info('Route requires auth, starting login');
            return this.auth.startCodeFlow()
              // return false so that route change does not happen
              .pipe(map(() => false));
          }

          return of(true);
        }));
  }
}
