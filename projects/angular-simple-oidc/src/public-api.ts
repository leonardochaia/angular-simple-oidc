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
export * from './lib/discovery-document/events';
export { AuthConfig } from './lib/config/models';

export * from './lib/errors';
export * from './lib/auth.events';
export * from './lib/models';
export {
    AUTH_CONFIG,
    AUTH_CONFIG_SERVICE,
    LOCAL_STORAGE_REF,
    WINDOW_REF
} from './lib/providers';

export { RefreshTokenClient } from './lib/refresh-token-client.service';

export { AutomaticRefreshModule } from './lib/automatic-refresh.module';

export { SessionCheckService } from './lib/session-management/session-check.service';
export { SessionManagementModule } from './lib/session-management/session-management.module';
export { AuthorizeEndpointSilentClientService } from './lib/session-management/authorize-endpoint-silent-client.service';
export * from './lib/session-management/errors';
export * from './lib/session-management/events';
export * from './lib/session-management/models';
export {
    SESSION_MANAGEMENT_CONFIG,
    SESSION_MANAGEMENT_CONFIG_SERVICE
} from './lib/session-management/providers';

export { PopupAuthorizationModule } from './lib/popup-authorization/popup-authorization.module';
export { AuthorizeEndpointPopupClientService } from './lib/popup-authorization/authorize-endpoint-popup-client.service';
export * from './lib/popup-authorization/errors';
export * from './lib/popup-authorization/models';
export {
    POPUP_AUTHORIZATION_CONFIG,
    POPUP_AUTHORIZATION_CONFIG_SERVICE
} from './lib/popup-authorization/providers';
