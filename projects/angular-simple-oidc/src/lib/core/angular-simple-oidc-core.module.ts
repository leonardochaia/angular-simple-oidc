import { NgModule } from '@angular/core';
import { TokenCryptoService } from './token-crypto.service';
import { TokenHelperService } from './token-helper.service';
import { TokenValidationService } from './token-validation.service';
import { TokenUrlService } from './token-url.service';
import { RefreshTokenValidationService } from './refresh-token/refresh-token-validation.service';

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
