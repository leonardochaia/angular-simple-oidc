import { Component } from '@angular/core';
import { AuthService, AuthorizeEndpointSilentClientService } from 'angular-simple-oidc';
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

  public get accessTokenExpiration$() {
    return this.auth.tokenExpiration$
      .pipe(
        map(time => new Date(time))
      );
  }

  constructor(
    private readonly auth: AuthService,
    private readonly authorizeSilentClient: AuthorizeEndpointSilentClientService) { }

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
}
