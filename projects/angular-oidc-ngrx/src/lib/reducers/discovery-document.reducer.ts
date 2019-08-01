import { Action, createReducer, on, createFeatureSelector, createSelector } from '@ngrx/store';
import * as DiscoveryDocumentActions from '../actions/discovery-document.actions';
import { DiscoveryDocument } from 'angular-simple-oidc';

export interface State {
  document: DiscoveryDocument
  error?: any;
}

export const initialState: Partial<State> = {
};

const discoveryDocumentReducer = createReducer(
  initialState,

  on(DiscoveryDocumentActions.loadDiscoveryDocumentSuccess,
    (state, action) => ({ ...state, document: action.data })),
  on(DiscoveryDocumentActions.loadDiscoveryDocumentFailure,
    (state, action) => ({ error: action.error, document: null })),
);

export function reducer(state: State | undefined, action: Action) {
  return discoveryDocumentReducer(state, action);
}

export const selectFeature = createFeatureSelector('discoveryDocument');
export const selectDiscoveryDocument = createSelector(selectFeature, (s: State) => s.document);
export const selectDiscoveryDocumentError = createSelector(selectFeature, (s: State) => s.error);