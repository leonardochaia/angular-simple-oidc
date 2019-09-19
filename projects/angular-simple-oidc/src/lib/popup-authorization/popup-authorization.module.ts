import { NgModule, ModuleWithProviders } from '@angular/core';
import { AuthorizeEndpointPopupClientService } from './authorize-endpoint-popup-client.service';
import { PopupAuthorizationConfig } from './models';
import {
  POPUP_AUTHORIZATION_CONFIG,
  POPUP_AUTHORIZATION_CONFIG_SERVICE_PROVIDER,
  POPUP_AUTHORIZATION_CONFIG_INITIALIZER
} from './providers';

@NgModule({
  imports: [],
  providers: [
    AuthorizeEndpointPopupClientService,
  ],
  declarations: [],
})
export class PopupAuthorizationModule {

  /**
   * Should be called once on your Angular Root Application Module
   */
  public static forRoot(config?: PopupAuthorizationConfig): ModuleWithProviders {
    return {
      ngModule: PopupAuthorizationModule,
      providers: [
        config != null ? {
          provide: POPUP_AUTHORIZATION_CONFIG,
          useValue: config
        } : [],
        POPUP_AUTHORIZATION_CONFIG_SERVICE_PROVIDER,
        POPUP_AUTHORIZATION_CONFIG_INITIALIZER,
      ]
    };
  }
}
