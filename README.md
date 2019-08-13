# angular-simple-oidc

An Angular (currently 8+, lower versions could be supported) library for the [Open Id Connect Protocol](https://openid.net/specs/openid-connect-core-1_0.html) implementing:

* Discovery Document
* Code Flow
* Refresh Tokens
* Refresh Token before token expiring (in-progress)
* Session Checks (in-progress)

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

You will then need to supply the configuration for OIDC, you can do so statically for your entire application in the `app.module` file. You could use `environment.ts` config replacement for different prod/staging/development settings.
i.e:

**WARNING**: The clientSecret should not be treated as a secret. Some IdentityProviders require a secret for Code Flow, some don't.

```typescript
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';

import { AngularSimpleOidcModule } from 'angular-simple-oidc';

@NgModule({
  imports: [
    BrowserModule,

    AngularSimpleOidcModule.forRoot({
      clientId: 'example.client',
      // clientSecret: 'myDummySecret',
      openIDProviderUrl: 'http://my.oidc.provider.com',
      scope: 'openid profile offline_access',
    }),

  ],
  declarations: [
    AppComponent,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

```

#### Limitations

The downside when using this setup is that you're not able to change the configuration on runtime (i.e, get JSON file from server and load the config).
We're working on ways to provide config on runtime. #8

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
