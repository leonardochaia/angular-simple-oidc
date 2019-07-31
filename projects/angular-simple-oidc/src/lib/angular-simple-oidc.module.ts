import { NgModule, ModuleWithProviders } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { WINDOW_REF, AUTH_CONFIG } from './constants';
import { AuthConfig } from './config/models';
import { AuthConfigService } from './config/auth-config.service';
import { SIMPLE_OIDC_APP_INITIALIZER } from './auth.bootstrap';
import { TokenCryptoService } from './token/token-crypto.service';
import { TokenStorageService } from './token/token-storage.service';
import { TokenHelperService } from './token/token-helper.service';
import { TokenValidationService } from './token/token-validation.service';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import { OidcCodeFlowClient } from './token/oidc-code-flow-client.service';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './auth.service';

@NgModule({
  imports: [
    HttpClientModule,
    RouterModule.forChild([]),
  ],
  providers: [
    // Register static dependencies, which are not affected by configs
    {
      provide: WINDOW_REF,
      useValue: window
    },
    SIMPLE_OIDC_APP_INITIALIZER,
    TokenCryptoService,
    TokenStorageService,
    TokenHelperService,
    TokenValidationService,
    AuthConfigService,
    OidcDiscoveryDocClient,
    OidcCodeFlowClient,

    AuthService,
    AuthGuard,
  ],
  declarations: [],
})
export class AngularSimpleOidcModule {

  /**
   * Should be called once on your Angular Root Application Module
   */
  public static forRoot(config: AuthConfig): ModuleWithProviders {
    return {
      ngModule: AngularSimpleOidcModule,
      providers: [
        {
          provide: AUTH_CONFIG,
          useValue: config,
          multi: true
        }
      ]
    };
  }
}
