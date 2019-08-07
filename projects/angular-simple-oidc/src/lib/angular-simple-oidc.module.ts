import { NgModule, ModuleWithProviders } from '@angular/core';
import { AUTH_CONFIG, WINDOW_REF, LOCAL_STORAGE_REF } from './constants';
import { AuthConfig } from './config/models';
import { AuthConfigService } from './config/auth-config.service';
import { SIMPLE_OIDC_APP_INITIALIZER } from './auth.bootstrap';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import { OidcCodeFlowClient } from './oidc-code-flow-client.service';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './auth.service';
import { AngularSimpleOidcCoreModule } from './core/angular-simple-oidc-core.module';
import { TokenStorageService } from './token-storage.service';
import { TokenEndpointClientService } from './token-endpoint-client.service';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  imports: [
    HttpClientModule,
    AngularSimpleOidcCoreModule
  ],
  providers: [
    {
      provide: WINDOW_REF,
      useValue: window
    },
    {
      provide: LOCAL_STORAGE_REF,
      useValue: localStorage
    },
    AuthConfigService,
    TokenStorageService,
    TokenEndpointClientService,
    OidcDiscoveryDocClient,
    OidcCodeFlowClient,

    AuthService,
    AuthGuard,
  ],
  declarations: [],
  exports: [
    AngularSimpleOidcCoreModule
  ]
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
        },
        SIMPLE_OIDC_APP_INITIALIZER,
      ]
    };
  }
}
