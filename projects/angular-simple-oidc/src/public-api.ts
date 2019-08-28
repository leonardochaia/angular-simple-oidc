/*
 * Public API Surface of angular-simple-oidc
 */

export { AngularSimpleOidcModule } from './angular-simple-oidc.module';
export { AuthGuard } from './lib/guards/auth.guard';
export { AuthService } from './lib/auth.service';

export { EndSessionClientService } from './lib/end-session-client.service';
export { OidcCodeFlowClient } from './lib/oidc-code-flow-client.service';
export { TokenStorageService } from './lib/token-storage.service';
export { OidcDiscoveryDocClient } from './lib/discovery-document/oidc-discovery-doc-client.service';
export { AuthConfig } from './lib/config/models';

export * from './lib/errors';
export * from './lib/events/models';
export * from './lib/utils/filter-instance-of';
export * from './lib/auth.events';

export { RefreshTokenClient } from './lib/refresh-token-client.service';

export { AutomaticRefreshModule } from './lib/automatic-refresh.module';

export { SessionCheckService } from './lib/session-management/session-check.service';
export { SessionManagementModule } from './lib/session-management/session-management.module';
export { AuthorizeEndpointSilentClientService } from './lib/session-management/authorize-endpoint-silent-client.service';
export * from './lib/session-management/errors';
export * from './lib/session-management/events';
