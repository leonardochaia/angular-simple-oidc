import { Injectable, Inject } from '@angular/core';
import { AuthConfig, AuthConfigRequiredFields } from './models';
import { AUTH_CONFIG } from '../constants';

const DEFAULT_CONFIG: Partial<AuthConfig> = {
  discoveryDocumentUrl: `/.well-known/openid-configuration`,
  tokenCallbackRoute: 'oidc-token-callback',
  tokenValidation: {
    disableIdTokenIATValidation: false,
    idTokenIATOffsetAllowed: 10 // seconds
  },
  enableAuthorizationCallbackAppInitializer: true
};

@Injectable({
  providedIn: 'root'
})
export class AuthConfigService {

  public readonly baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;

  public readonly configuration: AuthConfig;

  constructor(
    @Inject(AUTH_CONFIG)
    configurations: AuthConfig[]) {

    // AUTH_CONFIG is a multi providers
    // so that multiple modules can provider configurations
    // we merge them all into one
    this.configuration = Object.assign({}, DEFAULT_CONFIG, ...configurations);

    this.validateConfiguration();
    this.sanitizeConfiguration();
  }

  protected validateConfiguration() {
    // Fields that are not in the config aka == undefined
    const invalidFields = AuthConfigRequiredFields
      .filter(field => !(field in this.configuration));

    if (invalidFields.length) {
      throw new Error(`Invalid Configuration: ${invalidFields.join(', ')} is required`);
    }
  }

  protected sanitizeConfiguration() {
    this.configuration.openIDProviderUrl = this.configuration.openIDProviderUrl.toLowerCase();
    if (!this.configuration.tokenValidation) {
      this.configuration.tokenValidation = {};
    }
  }
}
