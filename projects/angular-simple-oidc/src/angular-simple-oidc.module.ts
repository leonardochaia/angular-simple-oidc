import { NgModule, ModuleWithProviders } from '@angular/core';
import { AUTH_CONFIG, WINDOW_PROVIDER, LOCAL_STORAGE_PROVIDER } from './lib/constants';
import { AuthConfig } from './lib/config/models';
import { AuthConfigService } from './lib/config/auth-config.service';
import { SIMPLE_OIDC_APP_INITIALIZER } from './lib/auth.bootstrap';
import { OidcDiscoveryDocClient } from './lib/discovery-document/oidc-discovery-doc-client.service';
import { OidcCodeFlowClient } from './lib/oidc-code-flow-client.service';
import { AuthGuard } from './lib/guards/auth.guard';
import { AuthService } from './lib/auth.service';
import { AngularSimpleOidcCoreModule } from 'angular-simple-oidc/core';
import { TokenStorageService } from './lib/token-storage.service';
import { TokenEndpointClientService } from './lib/token-endpoint-client.service';
import { HttpClientModule } from '@angular/common/http';
import { RefreshTokenClient } from './lib/refresh-token-client.service';
import { TokenEventsModule } from './lib/token-events.module';
import { EndSessionClientService } from './lib/end-session-client.service';

@NgModule({
  imports: [
    HttpClientModule,
    AngularSimpleOidcCoreModule,
    TokenEventsModule
  ],
  providers: [
    WINDOW_PROVIDER,
    LOCAL_STORAGE_PROVIDER,

    AuthConfigService,
    TokenStorageService,
    TokenEndpointClientService,
    OidcDiscoveryDocClient,
    OidcCodeFlowClient,
    RefreshTokenClient,
    EndSessionClientService,

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
