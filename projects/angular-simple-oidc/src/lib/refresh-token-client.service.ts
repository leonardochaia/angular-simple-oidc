import { Injectable, Inject } from '@angular/core';
import { switchMap, take, map, withLatestFrom, tap } from 'rxjs/operators';
import { TokenEndpointClientService } from './token-endpoint-client.service';
import {
    RefreshTokenValidationService,
    TokenValidationService,
    TokenUrlService,
    TokenHelperService,
    TokenRequestResult,
} from 'angular-simple-oidc/core';
import { TokensValidatedEvent, TokensReadyEvent } from './auth.events';
import { TokenStorageService } from './token-storage.service';
import { Observable } from 'rxjs';
import { AUTH_CONFIG_SERVICE } from './providers';
import { ConfigService } from 'angular-simple-oidc/config';
import { AuthConfig } from './config/models';
import { EventsService, SimpleOidcInfoEvent } from 'angular-simple-oidc/events';

@Injectable()
export class RefreshTokenClient {

    constructor(
        @Inject(AUTH_CONFIG_SERVICE)
        protected readonly config: ConfigService<AuthConfig>,
        protected readonly tokenStorage: TokenStorageService,
        protected readonly tokenUrl: TokenUrlService,
        protected readonly tokenHelper: TokenHelperService,
        protected readonly tokenEndpointClient: TokenEndpointClientService,
        protected readonly refreshTokenValidation: RefreshTokenValidationService,
        protected readonly tokenValidation: TokenValidationService,
        protected readonly events: EventsService,
    ) { }

    public requestTokenWithRefreshCode(): Observable<TokenRequestResult> {
        return this.tokenStorage.currentState$.pipe(
            withLatestFrom(this.config.current$),
            take(1),
            switchMap(([localState, config]) => {
                const payload = this.tokenUrl.createRefreshTokenRequestPayload({
                    clientId: config.clientId,
                    clientSecret: config.clientSecret,
                    refreshToken: localState.refreshToken
                });

                this.events.dispatch(new SimpleOidcInfoEvent(`Refreshing token using refresh code`,
                    { payload, refreshToken: localState.refreshToken }));

                return this.tokenEndpointClient.call(payload);
            }),
            withLatestFrom(this.tokenStorage.currentState$),
            tap(([result, localState]) => {
                const originalToken = this.tokenHelper.getPayloadFromToken(localState.originalIdentityToken);

                this.events.dispatch(new SimpleOidcInfoEvent(`Validating new Identity Token against original`,
                    { result, originalToken }));

                this.refreshTokenValidation.validateIdToken(originalToken, result.decodedIdToken);
            }),
            tap(([result]) => {
                this.events.dispatch(new SimpleOidcInfoEvent(`Validating access token against at_hash`,
                    { accessToken: result.accessToken, hash: result.decodedIdToken.at_hash }));
                this.tokenValidation.validateAccessToken(result.accessToken, result.decodedIdToken.at_hash);
            }),
            tap(([result]) => this.events.dispatch(new TokensValidatedEvent(result))),
            switchMap(([result]) => {
                this.events.dispatch(new SimpleOidcInfoEvent(`Storing new tokens..`, result));
                return this.tokenStorage.storeTokens(result)
                    .pipe(map(() => result));
            }),
            tap((result) => this.events.dispatch(new TokensReadyEvent(result))),
        );
    }
}
