import { createAction, props } from '@ngrx/store';
import { DiscoveryDocument } from 'angular-simple-oidc';

export const loadDiscoveryDocument = createAction(
  '[DiscoveryDocument] Load Discovery Document'
);

export const loadDiscoveryDocumentSuccess = createAction(
  '[DiscoveryDocument] Load Discovery Document Success',
  props<{ data: DiscoveryDocument }>()
);

export const loadDiscoveryDocumentFailure = createAction(
  '[DiscoveryDocument] Load Discovery Document Failure',
  props<{ error: any }>()
);
