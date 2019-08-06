/*
 * Public API Surface of angular-simple-oidc
 */

export { AngularSimpleOidcModule } from './lib/angular-simple-oidc.module';
export { AuthGuard } from './lib/guards/auth.guard';
export { AuthService } from './lib/auth.service';
export { OidcDiscoveryDocClient } from './lib/discovery-document/oidc-discovery-doc-client.service';

export { TokenCryptoService } from './lib/token/token-crypto.service';
export { TokenHelperService } from './lib/token/token-helper.service';
export { TokenUrlService } from './lib/token/token-url.service';
export { TokenStorageService } from './lib/token/token-storage.service';
export { TokenValidationService } from './lib/token/token-validation.service';

export { AuthConfig } from './lib/config/models';
export { DiscoveryDocument, JWTKey, JWTKeys } from './lib/discovery-document/models';
export {
    LocalState,
    DecodedIdentityToken,
    TokenRequestResult
} from './lib/token/models';

export { urlJoin } from './lib/utils/url-join'