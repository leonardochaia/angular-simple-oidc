import { createAction, props } from '@ngrx/store';
import { AuthConfig } from 'angular-simple-oidc';

export const authConfigLoaded = createAction(
  '[AuthConfig] Config Loaded',
  props<{
    config: AuthConfig,
    appUrl: string
  }>()
);
