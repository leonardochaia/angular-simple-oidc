import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType, OnInitEffects } from '@ngrx/effects';
import { catchError, map, concatMap } from 'rxjs/operators';
import { of } from 'rxjs';

import * as DiscoveryDocumentActions from '../actions/discovery-document.actions';
import { OidcDiscoveryDocClient } from 'angular-simple-oidc';

@Injectable()
export class DiscoveryDocumentEffects implements OnInitEffects {

  loadDiscoveryDocuments$ = createEffect(() => this.actions$.pipe(
    ofType(DiscoveryDocumentActions.loadDiscoveryDocument),
    concatMap(() =>
      this.discoveryClient.requestDiscoveryDocument().pipe(
        map(data => DiscoveryDocumentActions.loadDiscoveryDocumentSuccess({ data })),
        catchError(error => of(DiscoveryDocumentActions.loadDiscoveryDocumentFailure({ error }))))
    )
  ));

  constructor(
    private readonly actions$: Actions,
    private readonly discoveryClient: OidcDiscoveryDocClient) { }

  public ngrxOnInitEffects() {
    return DiscoveryDocumentActions.loadDiscoveryDocument();
  }

}
