import { Injectable } from '@angular/core';
import { switchMap, take, map, withLatestFrom, tap } from 'rxjs/operators';
import { AuthConfigService } from './config/auth-config.service';
import { TokenEndpointClientService } from './token-endpoint-client.service';
import {
    RefreshTokenValidationService,
    TokenValidationService,
    TokenUrlService,
    TokenHelperService,
} from 'angular-simple-oidc/core';
import { EventsService } from './events/events.service';
import { SimpleOidcInfoEvent } from './events/models';
import { TokensValidatedEvent, TokensReadyEvent } from './auth.events';
import { TokenStorageService } from './token-storage.service';

@Injectable()
export class RefreshTokenClient {

    protected get authConfig() {
        return this.config.configuration;
    }

    constructor(
        protected readonly config: AuthConfigService,
        protected readonly tokenStorage: TokenStorageService,
        protected readonly tokenUrl: TokenUrlService,
        protected readonly tokenHelper: TokenHelperService,
        protected readonly tokenEndpointClient: TokenEndpointClientService,
        protected readonly refreshTokenValidation: RefreshTokenValidationService,
        protected readonly tokenValidation: TokenValidationService,
        protected readonly events: EventsService,
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
