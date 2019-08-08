import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { switchMap, take, map, withLatestFrom, tap } from 'rxjs/operators';
import { AuthConfigService } from './config/auth-config.service';
import {
    TokenStorageService,
    TokenUrlService, TokenHelperService,
} from 'angular-simple-oidc';
import { TokenEndpointClientService } from './token-endpoint-client.service';
import { RefreshTokenValidationService } from './core/refresh-token/refresh-token-validation.service';
import { TokenValidationService } from './core/token-validation.service';

@Injectable()
export class RefreshTokenClient {

    protected get authConfig() {
        return this.config.configuration;
    }

    constructor(
        protected readonly http: HttpClient,
        protected readonly config: AuthConfigService,
        protected readonly tokenStorage: TokenStorageService,
        protected readonly tokenUrl: TokenUrlService,
        protected readonly tokenHelper: TokenHelperService,
        protected readonly tokenEndpointClient: TokenEndpointClientService,
        protected readonly refreshTokenValidation: RefreshTokenValidationService,
        protected readonly tokenValidation: TokenValidationService,
    ) { }

    public requestTokenWithRefreshCode() {
        return this.tokenStorage.currentState$.pipe(
            take(1),
            switchMap(localState => {
                const payload = this.tokenUrl.createRefreshTokenRequestPayload({
                    clientId: this.authConfig.clientId,
                    clientSecret: this.authConfig.clientSecret,
                    refreshToken: localState.refreshToken
                });
                return this.tokenEndpointClient.call(payload);
            }),
            withLatestFrom(this.tokenStorage.currentState$),
            tap(([result, localState]) => {
                console.info('Validating identity token..');
                const originalToken = this.tokenHelper.getPayloadFromToken(localState.originalIdentityToken);
                this.refreshTokenValidation.validateIdToken(originalToken, result.decodedIdToken);
            }),
            tap(([result]) => {
                console.info('Validating access token..');
                this.tokenValidation.validateAccessToken(result.accessToken, result.decodedIdToken.at_hash);
            }),
            switchMap(([result]) => {
                console.info('Storing tokens..');
                return this.tokenStorage.storeTokens(result)
                    .pipe(map(() => result));
            })
        );
    }
}
