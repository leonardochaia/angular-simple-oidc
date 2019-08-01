import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import { concatMap, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import * as TokenStorageActions from '../actions/token-storage.actions';
import { TokenStorageService } from 'angular-simple-oidc';


@Injectable()
export class TokenStorageEffects {

  storeAuthorizationState$ = createEffect(() => this.actions$.pipe(
    ofType(TokenStorageActions.setAuthorizationState),
    concatMap((action) =>
      this.tokenStorage.storePreAuthorizationState(action.payload).pipe(
        map(() => TokenStorageActions.setAuthorizationStateSuccess()),
        catchError(error => of(TokenStorageActions.setAuthorizationStateError({ error }))))
    )
  ));

  constructor(
    protected readonly actions$: Actions,
    protected readonly tokenStorage: TokenStorageService,
  ) { }
}
