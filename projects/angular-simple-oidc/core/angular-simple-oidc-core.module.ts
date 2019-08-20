import { NgModule } from '@angular/core';
import { TokenCryptoService } from './lib/token-crypto.service';
import { TokenHelperService } from './lib/token-helper.service';
import { TokenValidationService } from './lib/token-validation.service';
import { TokenUrlService } from './lib/token-url.service';
import { RefreshTokenValidationService } from './lib/refresh-token/refresh-token-validation.service';

@NgModule({
  imports: [
  ],
  providers: [
    TokenCryptoService,
    TokenUrlService,
    TokenHelperService,
    TokenValidationService,
    RefreshTokenValidationService,
  ],
  declarations: [],
})
export class AngularSimpleOidcCoreModule { }
