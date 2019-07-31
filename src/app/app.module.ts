import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { StoreRouterConnectingModule } from '@ngrx/router-store';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { EffectsModule } from '@ngrx/effects';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { reducers, metaReducers } from './reducers';
import { environment } from '../environments/environment';
import { AppEffects } from './app.effects';

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

    StoreModule.forRoot(reducers, {
      metaReducers,
      runtimeChecks: {
        strictStateImmutability: true,
        strictActionImmutability: true
      }
    }),
    EffectsModule.forRoot([AppEffects]),

    StoreRouterConnectingModule.forRoot(),
    !environment.production ? StoreDevtoolsModule.instrument({
      name: 'Angular Simple OIDC',
    }) : [],

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
