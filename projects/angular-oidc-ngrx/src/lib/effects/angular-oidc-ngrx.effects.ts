import { Injectable, Inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import { concatMap, race, switchMap, map, withLatestFrom, catchError, filter } from 'rxjs/operators';
import { EMPTY, of } from 'rxjs';

import * as AngularOidcNgrxActions from '../actions/angular-oidc-ngrx.actions';
import * as TokenStorageActions from '../actions/token-storage.actions';
import { Store } from '@ngrx/store';
import * as fromOidcNgrx from '../reducers/angular-oidc-ngrx.reducer';
import * as fromDiscoveryDocument from '../reducers/discovery-document.reducer';
import * as fromAuthConfig from '../reducers/auth-config.reducer';
import * as fromTokenStorage from '../reducers/token-storage.reducer';

import { TokenUrlService, AuthConfig, urlJoin, TokenStorageService } from 'angular-simple-oidc';
import { WINDOW_REF } from 'angular-simple-oidc/lib/constants';


@Injectable()
export class AngularOidcNgrxEffects {

  startCodeFlow$ = createEffect(() => this.actions$.pipe(
    ofType(AngularOidcNgrxActions.startCodeFlow),
    withLatestFrom(this.discoveryDoc$, this.config$),
    switchMap(([startCodeFlow, discoveryDocument, config]) => {

      const authConfig = config.config;
      // const authorizeParams = startCodeFlow.params;
      const result = this.tokenUrl.createAuthorizeUrl(
        discoveryDocument.authorization_endpoint, {
          clientId: authConfig.clientId,
          scope: authConfig.scope,
          responseType: 'code',
          redirectUri: urlJoin(config.appUrl, authConfig.tokenCallbackRoute)
        });
      return [
        TokenStorageActions.setAuthorizationState({
          payload: {
            authorizeUrl: result.url,
            codeChallenge: result.codeChallenge,
            codeVerifier: result.codeVerifier,
            nonce: result.nonce,
            state: result.state,
            preRedirectUrl: this.window.location.href
          }
        }),
        AngularOidcNgrxActions.waitForLocalStateAndRedirect({ nonce: result.nonce })
      ];
    })
  ));

  waitForLocalStateAndRedirect$ = createEffect(() => this.actions$.pipe(
    ofType(AngularOidcNgrxActions.waitForLocalStateAndRedirect),
    withLatestFrom(this.authorizeState$),
    switchMap(([action, localState]) => {

      if (action.nonce != localState.nonce) {
        throw new Error('should not happen?')
      } else {
        this.changeUrl(localState.authorizeUrl);
      }

      return of(AngularOidcNgrxActions.codeFlowStarted());
    }))
  );

  protected get discoveryDoc$() {
    return this.store.select(fromDiscoveryDocument.selectDiscoveryDocument);
  }

  protected get config$() {
    return this.store.select(fromAuthConfig.selectAuthConfig);
  }

  protected get authorizeState$() {
    return this.store.select(fromTokenStorage.selectAuthorize);
  }

  constructor(
    protected readonly actions$: Actions,
    protected readonly store: Store<fromOidcNgrx.State>,
    protected readonly tokenUrl: TokenUrlService,
    @Inject(WINDOW_REF)
    protected readonly window: Window,
  ) { }

  protected changeUrl(url: string) {
    console.info(`Redirecting to ${url}`);
    this.window.location.href = url;
  }
}
