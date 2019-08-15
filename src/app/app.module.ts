import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { AngularSimpleOidcModule, AutomaticRefreshModule } from 'angular-simple-oidc';
import { HomeComponent } from './home/home.component';

@NgModule({
  imports: [
    BrowserModule,

    AngularSimpleOidcModule.forRoot({
      openIDProviderUrl: 'http://localhost:420',
      clientId: 'example.client',
      clientSecret: 'myDummySecret',
      scope: 'openid profile offline_access',
    }),

    AutomaticRefreshModule,

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
