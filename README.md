# angular-simple-oidc

An Angular (currently 8+, lower versions could be supported) library for the [Open Id Connect Protocol](https://openid.net/specs/openid-connect-core-1_0.html) implementing:

* Discovery Document
* Code Flow
* Refresh Tokens
* Automatic Token Refresh before token expiring
* Session Checks

## Motivation

Why another OIDC library?
I needed a library that is:

* Compilant with the OIDC protocol.
* Returns descriptive error messages.
* Works well with observables.
* Integrates seamlesly with NGRX.
* PRs are merged with caution.
* OIDC protocol practically does not change, so I expect only bugfixes to be merged once it's stable.
* Respects Semantic Versioning.
* Mayor versions to be released together with Angular's.
* Basic features. More features only if I need them (refresh tokens, session checks) through other modules/packages.

## How to use

### Installation

Install from NPM

```shell
yarn add angular-simple-oidc
```

### Static Configuration

You will then need to supply the configuration for OIDC.
Configuration can be provided statically for in the `app.module` file.
You could use `environment.ts` config replacement for different prod/staging/development settings.
i.e:

**WARNING: The clientSecret should not be treated as a secret. Some IdentityProviders require a secret for Code Flow, some don't.**

```typescript
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';

import {
  AngularSimpleOidcModule,
  AutomaticRefreshModule,
  SessionManagementModule
} from 'angular-simple-oidc';

@NgModule({
  imports: [
    BrowserModule,

    AngularSimpleOidcModule.forRoot({
      clientId: 'example.client',
      // clientSecret: 'myDummySecret',
      openIDProviderUrl: 'http://my.oidc.provider.com',
      scope: 'openid profile offline_access',
    }),

    // For automatic token refresh.
    // AutomaticRefreshModule,

    // For Session Management (read below)
    // SessionManagementModule.forRoot({
    //   iframePath: "assets/oidc-iframe.html"
    // })

  ],
  declarations: [
    AppComponent,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

```

#### Asynchronous Configuration

The downside of using static configuration is that your config ends up hard-coded in your app bundle.
You can customize the configuration provision by using a service and overriding Angular Simple OIDC configuration providers.

Check the `custom-config` for a [complete example](/projects/samples/custom-config)

```typescript
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

```

#### Requesting more scopes

Currently you can only provide scopes in the configuration.
WIP #11

## AuthGuard

When using the router, you can use the AuthGuard to prevent a route from loading without a valid Access Token.
If the token is not valid or expired, Code Flow will be started.

```typescript
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'angular-simple-oidc';
import { HomeComponent } from './home/home.component';

const routes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    component: HomeComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

```

## AuthService

You can manually start the Code Flow injecting the `AuthService` and calling `startCodeFlow()`.
This will trigger a redirect to the IDP `authorize` (aka login) page.
You normally want to provide a never-stopping loading on subscription, since the window will be redirected. i.e:

```typescript
export class MyComponent {
    public loadingForEver = false;
    constructor(private readonly auth: AuthService) { }

    public login() {
        this.auth.startCodeFlow()
        .subscribe(()=>{
            this.loadingForEver = true;
        });
    }
}
```

When the IDP redirects back to your app, `angular-simple-oidc` will take care of parsing the callback URL, validating and storing tokens and redirecting back to the state where you were when you started the Code Flow.

You can obtain the tokens by using the `AuthService` observables. i.e:

```typescript
export class MyComponent {
    constructor(private readonly auth: AuthService) {
        auth.accessToken$.subscribe(token =>{
            console.info(`Current Access token: ${token}`);
            // This will return the current token (it's a BehaviorSubject)
            // and will emit when a new token is obtained.
            // Note that a token will be returned even if it's expired
        });
        // Remember to takeUntil(this.destroyed$) or use the async pipe to prevent memory leaks.
    }
}
```

**Note that a token will be returned even if it's expired**;.
To check if the user "is logged in", meaning that has an Access Token and the token is not yet expired you must use the `isLoggedIn$` observable instead.

## End Session

To log out the user, use the `AuthService.endSession()`. Will redirect to the log out page of the IdentityProvider.

## Automatic refresh

The `AutomaticRefreshModule` will attempt to refresh the token using Refresh Tokens just before the tokens expire.

## Session Management

The `SessionManagementModule` will use an iframe to an endpoint in the Identity Provider to check if the session is still active.
If the session has finished, `SessionTerminatedEvent` will be fired.

You'll need to provide an HTML file in your `/assets` directory with the below contents:

```html
<html>
<!-- This file is required for angular-simple-oidc Session Management -->
<body>
    <script>
        (window.opener || window.parent).postMessage(location.href, location.origin);
    </script>
</body>

</html>
```
