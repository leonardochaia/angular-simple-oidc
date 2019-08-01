import { Injectable, Inject } from '@angular/core';
import { Actions, createEffect, ofType, OnInitEffects } from '@ngrx/effects';

import { map } from 'rxjs/operators';

import * as AuthConfigActions from '../actions/auth-config.actions';
import { WINDOW_REF } from 'angular-simple-oidc/lib/constants';
import { AuthConfigService } from 'angular-simple-oidc/lib/config/auth-config.service';


//@dynamic
@Injectable()
export class AuthConfigEffects implements OnInitEffects {

  // loadAuthConfigs$ = createEffect(() => this.actions$.pipe(
  //   ofType(AuthConfigActions.authConfigLoaded),
  //   /** An EMPTY observable only emits completion. Replace with your own observable API request */
  //   map(() => AuthConfigActions.setAppUrl({
  //     url: `${this.window.location.protocol}//${this.window.location.host}${this.window.location.pathname}`
  //   }))
  // ));

  constructor(
    protected readonly actions$: Actions,
    protected readonly authConfig: AuthConfigService,
    @Inject(WINDOW_REF)
    protected readonly window: Window) { }

  ngrxOnInitEffects() {
    return AuthConfigActions.authConfigLoaded({
      config: this.authConfig.configuration,
      appUrl: `${this.window.location.protocol}//${this.window.location.host}${this.window.location.pathname}`,
    });
  }
}
