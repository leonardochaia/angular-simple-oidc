import { Action, createReducer, on } from '@ngrx/store';
import * as AngularOidcNgrxActions from '../actions/angular-oidc-ngrx.actions';

export interface State {

}

export const initialState: State = {

};

const angularOidcNgrxReducer = createReducer(
  initialState,

);

export function reducer(state: State | undefined, action: Action) {
  return angularOidcNgrxReducer(state, action);
}
