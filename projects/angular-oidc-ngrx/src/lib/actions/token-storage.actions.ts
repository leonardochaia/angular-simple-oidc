import { createAction, props } from '@ngrx/store';

export const setAuthorizationState = createAction(
  '[Simple OIDC] Set Authorization State',
  props<{
    payload: {
      nonce: string,
      state: string,
      codeVerifier: string,
      codeChallenge: string,
      authorizeUrl: string,
      preRedirectUrl: string,
    }
  }>()
);


export const setAuthorizationStateSuccess = createAction(
  '[Simple OIDC] Set Authorization State Succeeded'
);


export const setAuthorizationStateError = createAction(
  '[Simple OIDC] Set Authorization State Failed',
  props<{ error: any }>()
);

