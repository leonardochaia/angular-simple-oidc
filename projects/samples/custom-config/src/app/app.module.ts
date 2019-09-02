import { BrowserModule } from '@angular/platform-browser';
import { NgModule, Provider } from '@angular/core';

import { AppComponent } from './app.component';
import { AngularSimpleOidcModule, AUTH_CONFIG, SessionManagementModule, SESSION_MANAGEMENT_CONFIG } from 'angular-simple-oidc';
import { ExternalConfigService } from './external-config.service';
import { HttpClientModule } from '@angular/common/http';
import { map } from 'rxjs/operators';

// needs to be exporter for AOT
export function getExternalAuthConfigFactory(externalConfig: ExternalConfigService) {
  return externalConfig.config$
    .pipe(map(c => c.auth));
}

export const EXTERNAL_AUTH_CONFIG_PROVIDER: Provider = {
  provide: AUTH_CONFIG,
  useFactory: getExternalAuthConfigFactory,
  deps: [ExternalConfigService],
};

export function getExternalSessionConfigFactory(externalConfig: ExternalConfigService) {
  return externalConfig.config$
    .pipe(map(c => c.session));
}

export const EXTERNAL_SESSION_CONFIG_PROVIDER: Provider = {
  provide: SESSION_MANAGEMENT_CONFIG,
  useFactory: getExternalSessionConfigFactory,
  deps: [ExternalConfigService],
};

@NgModule({
  imports: [
    BrowserModule,
    HttpClientModule,

    // Do not provide a static config here.
    AngularSimpleOidcModule.forRoot(),
    SessionManagementModule.forRoot()
  ],
  providers: [
    EXTERNAL_AUTH_CONFIG_PROVIDER,
    EXTERNAL_SESSION_CONFIG_PROVIDER,
  ],
  declarations: [
    AppComponent,
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
