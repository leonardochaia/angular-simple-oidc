import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import {
  AngularSimpleOidcModule,
  AutomaticRefreshModule,
  SessionManagementModule,
  PopupAuthorizationModule
} from 'angular-simple-oidc';
import { HomeComponent } from './home/home.component';

@NgModule({
  imports: [
    BrowserModule,

    AngularSimpleOidcModule.forRoot({
      openIDProviderUrl: 'https://demo.identityserver.io/',
      clientId: 'interactive.confidential',
      clientSecret: 'secret',
      scope: 'openid profile offline_access',
    }),

    AutomaticRefreshModule,
    PopupAuthorizationModule.forRoot({
      childWindowPath: 'assets/oidc-iframe.html'
    }),
    SessionManagementModule.forRoot({
      iframePath: 'assets/oidc-iframe.html'
    }),

    AppRoutingModule,

  ],
  declarations: [
    AppComponent,
    HomeComponent,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
