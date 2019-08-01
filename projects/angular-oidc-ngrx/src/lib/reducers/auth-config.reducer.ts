import { Action, createReducer, on, createFeatureSelector, createSelector } from '@ngrx/store';
import * as AuthConfigActions from '../actions/auth-config.actions';
import { AuthConfig } from 'angular-simple-oidc';

export interface State {
  config: AuthConfig;
  appUrl: string;
}

export const initialState: Partial<State> = {
};

const authConfigReducer = createReducer(
  initialState,

  on(AuthConfigActions.authConfigLoaded,
    (state, action) => ({ ...state, config: action.config, appUrl: action.appUrl })),

);

export function reducer(state: State | undefined, action: Action) {
  return authConfigReducer(state, action);
}


export const selectFeature = createFeatureSelector('authConfig');
export const selectAuthConfig = createSelector(selectFeature, (s: State) => s);