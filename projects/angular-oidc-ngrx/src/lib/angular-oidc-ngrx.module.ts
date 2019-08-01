import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import * as fromAngularOidcNgrx from './reducers/angular-oidc-ngrx.reducer';
import { EffectsModule } from '@ngrx/effects';
import { AngularOidcNgrxEffects } from './effects/angular-oidc-ngrx.effects';
import * as fromDiscoveryDocument from './reducers/discovery-document.reducer';
import { DiscoveryDocumentEffects } from './effects/discovery-document.effects';
import * as fromAuthConfig from './reducers/auth-config.reducer';
import { AuthConfigEffects } from './effects/auth-config.effects';
import * as fromTokenStorage from './reducers/token-storage.reducer';
import { TokenStorageEffects } from './effects/token-storage.effects';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    StoreModule.forFeature('angularOidcNgrx', fromAngularOidcNgrx.reducer),
    StoreModule.forFeature('discoveryDocument', fromDiscoveryDocument.reducer),
    StoreModule.forFeature('authConfig', fromAuthConfig.reducer),
    StoreModule.forFeature('tokenStorage', fromTokenStorage.reducer),
    EffectsModule.forFeature([
      AngularOidcNgrxEffects,
      DiscoveryDocumentEffects,
      AuthConfigEffects,
      TokenStorageEffects
    ]),
  ]
})
export class AngularOidcNgrxModule { }
