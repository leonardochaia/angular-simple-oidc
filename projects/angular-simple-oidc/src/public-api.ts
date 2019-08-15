/*
 * Public API Surface of angular-simple-oidc
 */

export { AngularSimpleOidcModule } from './lib/angular-simple-oidc.module';
export { AuthGuard } from './lib/guards/auth.guard';
export { AuthService } from './lib/auth.service';

export { TokenStorageService } from './lib/token-storage.service';
export { OidcDiscoveryDocClient } from './lib/discovery-document/oidc-discovery-doc-client.service';

export { TokenCryptoService } from './lib/core/token-crypto.service';
export { TokenHelperService } from './lib/core/token-helper.service';
export { TokenUrlService } from './lib/core/token-url.service';
export { TokenValidationService } from './lib/core/token-validation.service';

export { AuthConfig } from './lib/config/models';
export {
    DiscoveryDocument,
    JWTKey,
    JWTKeys,
    LocalState,
    DecodedIdentityToken,
    TokenRequestResult
} from './lib/core/models';


export * from './lib/core/errors';
export * from './lib/core/token-validation-errors';
export * from './lib/core/refresh-token/refresh-token-validation-errors';
export * from './lib/errors';

export * from './lib/events/models';
export * from './lib/auth.events';

export { RefreshTokenClient } from './lib/refresh-token-client.service';
export { RefreshTokenValidationService } from './lib/core/refresh-token/refresh-token-validation.service';

export { AutomaticRefreshModule } from './lib/automatic-refresh.module';
