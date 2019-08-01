import { createAction, props } from '@ngrx/store';

export const startCodeFlow = createAction(
  '[Simple OIDC] Start Code Flow'
);

export const codeFlowStarted = createAction(
  '[Simple OIDC] Code Flow Started'
);

export const waitForLocalStateAndRedirect = createAction(
  '[Simple OIDC] Wait for authorization state and redirect',
  props<{ nonce: string }>()
)