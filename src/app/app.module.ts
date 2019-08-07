import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { AngularSimpleOidcModule } from 'angular-simple-oidc';
import { HomeComponent } from './home/home.component';

@NgModule({
  imports: [
    BrowserModule,

    AngularSimpleOidcModule.forRoot({
      clientId: 'example.client',
      clientSecret: 'myDummySecret',
      openIDProviderUrl: 'http://localhost:420',
      scope: "openid profile",
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
