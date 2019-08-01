import { Action, createReducer, on, createFeatureSelector, createSelector } from '@ngrx/store';
import * as TokenStorageActions from '../actions/token-storage.actions';
import { LocalState } from 'angular-simple-oidc';

export interface AuthorizeState {
  nonce: string,
  state: string,
  codeVerifier: string,
  codeChallenge: string,
  authorizeUrl: string,
  preRedirectUrl: string,
}

export interface State {
  authorize: AuthorizeState;
}

export const initialState: Partial<State> = {

};

const tokenStorageReducer = createReducer(
  initialState,

  on(TokenStorageActions.setAuthorizationState,
    (state, action) => ({ ...state, authorize: action.payload })),

);

export function reducer(state: State | undefined, action: Action) {
  return tokenStorageReducer(state, action);
}

export const selectFeature = createFeatureSelector('tokenStorage');
export const selectAuthorize = createSelector(selectFeature, (s: State) => s.authorize);