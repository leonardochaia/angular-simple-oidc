import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { RefreshTokenClient } from './refresh-token-client.service';
import { RefreshTokenValidationService } from './refresh-token-validation.service';
import { AngularSimpleOidcModule } from '../angular-simple-oidc.module';

@NgModule({
  imports: [
    HttpClientModule,
    AngularSimpleOidcModule,
  ],
  providers: [
    RefreshTokenValidationService,
    RefreshTokenClient,
  ],
  declarations: [],
})
export class RefreshTokenModule { }
