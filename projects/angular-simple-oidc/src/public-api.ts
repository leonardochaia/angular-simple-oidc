/*
 * Public API Surface of angular-simple-oidc
 */

export { AngularSimpleOidcModule } from './lib/angular-simple-oidc.module';
export { AuthGuard } from './lib/guards/auth.guard'
export { AuthService } from './lib/auth.service'
export { OidcDiscoveryDocClient } from './lib/discovery-document/oidc-discovery-doc-client.service'

export { AuthConfig } from './lib/config/models'
export { DiscoveryDocument, JWTKey, JWTKeys } from './lib/discovery-document/models'
