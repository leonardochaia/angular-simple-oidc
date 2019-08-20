/*
 * Public API Surface of angular-simple-oidc
 */

export { AngularSimpleOidcModule } from './angular-simple-oidc.module';
export { AuthGuard } from './lib/guards/auth.guard';
export { AuthService } from './lib/auth.service';

export { TokenStorageService } from './lib/token-storage.service';
export { OidcDiscoveryDocClient } from './lib/discovery-document/oidc-discovery-doc-client.service';
export { AuthConfig } from './lib/config/models';

export * from './lib/errors';
export * from './lib/events/models';
export * from './lib/auth.events';

export { RefreshTokenClient } from './lib/refresh-token-client.service';

export { AutomaticRefreshModule } from './lib/automatic-refresh.module';
