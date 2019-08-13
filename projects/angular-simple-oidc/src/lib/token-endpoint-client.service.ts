import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { switchMap, take, map, catchError, tap } from 'rxjs/operators';
import { TokenRequestResult, DecodedIdentityToken } from './core/models';
import { TokenValidationService } from './core/token-validation.service';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import { TokenHelperService } from './core/token-helper.service';
import { TokenEndpointError, TokenEndpointUnexpectedError } from './errors';
import { SimpleOidcError } from './core/errors';
import { EventsService } from './events/events.service';
import { SimpleOidcInfoEvent } from './events/models';
import { TokensObtainedEvent } from './auth.events';

interface TokenEndpointResponse {
    access_token?: string;
    expires_in?: number;
    id_token?: string;
    error?: string;
    refresh_token?: string;
}

@Injectable()
export class TokenEndpointClientService {

    constructor(
        protected readonly http: HttpClient,
        protected readonly discoveryDocumentClient: OidcDiscoveryDocClient,
        protected readonly tokenValidation: TokenValidationService,
        protected readonly tokenHelper: TokenHelperService,
        protected readonly events: EventsService,
    ) { }

    public call(payload: string) {
        const headers: HttpHeaders = new HttpHeaders()
            .set('Content-Type', 'application/x-www-form-urlencoded');
        return this.discoveryDocumentClient.current$
            .pipe(
                take(1),
                switchMap(({ token_endpoint }) => {
                    this.events.dispatch(new SimpleOidcInfoEvent(`Executing Token Endpoint`,
                        { url: token_endpoint, payload }));

                    return this.http.post<TokenEndpointResponse>(token_endpoint, payload, { headers: headers });
                }),
                tap({
                    error: (e: HttpErrorResponse) => {
                        if (e instanceof SimpleOidcError) {
                            return;
                        }

                        if (e.status === 400) {
                            // https://tools.ietf.org/html/rfc6749#section-5.2
                            throw new TokenEndpointError(e.error.error, e);
                        } else {
                            throw new TokenEndpointUnexpectedError(e);
                        }
                    }
                }),
                map(response => {
                    let expiresAt: Date;
                    if (response.expires_in) {
                        expiresAt = this.tokenHelper.getExpirationFromExpiresIn(response.expires_in);
                    } else {
                        this.events.dispatch(new SimpleOidcInfoEvent(`Token Response did not contain expires_in`,
                            response));
                    }

                    let decodedToken: DecodedIdentityToken;
                    if (response.id_token) {
                        this.events.dispatch(new SimpleOidcInfoEvent(`Validating Identity Token format`,
                            response.id_token));
                        this.tokenValidation.validateIdTokenFormat(response.id_token);

                        decodedToken = this.tokenHelper.getPayloadFromToken(response.id_token);
                        this.events.dispatch(new SimpleOidcInfoEvent(`Identity Token Payload decoded`,
                            decodedToken));
                    } else {
                        this.events.dispatch(new SimpleOidcInfoEvent(`Token Response did not contain id_token`,
                            response));
                    }

                    const result: TokenRequestResult = {
                        accessToken: response.access_token,
                        accessTokenExpiresIn: response.expires_in,
                        accessTokenExpiresAt: expiresAt ? expiresAt.getTime() : null,
                        error: response.error,
                        idToken: response.id_token,
                        refreshToken: response.refresh_token,
                        decodedIdToken: decodedToken
                    };

                    this.events.dispatch(new TokensObtainedEvent(result));

                    return result;
                })
            );
    }
}
