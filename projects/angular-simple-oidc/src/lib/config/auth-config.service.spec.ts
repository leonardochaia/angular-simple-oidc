import { TestBed } from '@angular/core/testing';
import { AUTH_CONFIG } from '../constants';
import { AuthConfigService } from './auth-config.service';
import { AuthConfig } from './models';

function configureService(...configs: AuthConfig[]) {

  TestBed.configureTestingModule({
    providers: [
      ...configs.map(c => ({
        provide: AUTH_CONFIG,
        multi: true,
        useValue: c
      })),
      AuthConfigService
    ]
  });

  return TestBed.get(AuthConfigService) as AuthConfigService;
}

describe('Auth Configuration Service', () => {

  it('should be created', () => {
    const authConfig = configureService({
      openIDProviderUrl: 'http://localhost:1992',
      clientId: 'test.client',
      scope: 'test.scope',
      clientSecret: 'dummy',
    });
    expect(authConfig).toBeTruthy();
  });

  it('should force Core URL to be lowercase', () => {
    const authConfig = configureService({
      openIDProviderUrl: 'http://localhost:1992',
      clientId: 'test.client',
      scope: 'test.scope',
      clientSecret: 'dummy',
    }).configuration;

    expect(authConfig.openIDProviderUrl).toBe('http://localhost:1992');
  });

  it('should handle invalid url gracefully', () => {
    expect(() => {
      configureService({} as any).configuration;
    }).toThrowError(/openIDProviderUrl(.*)is required/);
  });

  it('should handle invalid clientId gracefully', () => {
    expect(() => {
      console.log(configureService({} as any).configuration);
    }).toThrowError(/clientId(.*)is required/);
  });

  it('should handle invalid scope gracefully', () => {
    expect(() => {
      configureService({} as any).configuration;
    }).toThrowError(/scope(.*)is required/);
  });

  it('should merge all AUTH_CONFIG in the injector', () => {
    const discoUri = 'http://example.com';
    const config = configureService(
      {
        openIDProviderUrl: 'http://localhost:1992',
        clientId: 'test.client',
        scope: 'test.scope',
        clientSecret: 'dummy',
      },
      {
        discoveryDocumentUrl: discoUri
      } as Partial<AuthConfig> as AuthConfig,
      {
        tokenCallbackRoute: 'waca'
      } as Partial<AuthConfig> as AuthConfig
    ).configuration;

    expect(config.clientId).toBe('test.client');
    expect(config.discoveryDocumentUrl).toEqual(discoUri);
    expect(config.tokenCallbackRoute).toEqual('waca');
  });
});
