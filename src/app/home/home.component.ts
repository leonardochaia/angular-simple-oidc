import { Component } from '@angular/core';
import {
  AuthService,
  AuthorizeEndpointSilentClientService,
  AuthorizeEndpointPopupClientService
} from 'angular-simple-oidc';
import { map } from 'rxjs/operators';

@Component({
  selector: 'soidc-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {

  public get identityTokenDecoded$() {
    return this.auth.identityTokenDecoded$;
  }

  public get identityToken$() {
    return this.auth.identityToken$;
  }

  public get accessToken$() {
    return this.auth.accessToken$;
  }

  public get refreshToken$() {
    return this.auth.refreshToken$;
  }

  public get isLoggedIn$() {
    return this.auth.isLoggedIn$;
  }

  public profile$ = this.auth.userInfo$;

  public get accessTokenExpiration$() {
    return this.auth.tokenExpiration$
      .pipe(
        map(time => new Date(time))
      );
  }

  constructor(
    private readonly auth: AuthService,
    private readonly authorizeSilentClient: AuthorizeEndpointSilentClientService,
    private readonly authorizePopupClient: AuthorizeEndpointPopupClientService,
  ) { }

  public doTokenRefresh() {
    this.auth.refreshAccessToken()
      .subscribe();
  }

  public endSession() {
    this.auth.endSession()
      .subscribe();
  }

  public doCodeFlowInIframe() {
    this.authorizeSilentClient.startCodeFlowInIframe()
      .subscribe();
  }

  public doAuthorizeWithRedirect() {
    this.auth.startCodeFlow()
      .subscribe();
  }

  public doLoginInPopup() {
    this.authorizePopupClient.startCodeFlowInPopup()
      .subscribe();
  }
}
