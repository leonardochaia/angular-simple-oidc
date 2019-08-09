import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { switchMap, take, map, catchError, tap } from 'rxjs/operators';
import { TokenRequestResult, DecodedIdentityToken } from './core/models';
import { TokenValidationService } from './core/token-validation.service';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import { TokenHelperService } from './core/token-helper.service';
import { TokenEndpointError, TokenEndpointUnexpectedError } from './errors';
import { SimpleOidcError } from './core/errors';

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
    ) { }

    public call(payload: string) {
        const headers: HttpHeaders = new HttpHeaders()
            .set('Content-Type', 'application/x-www-form-urlencoded');
        return this.discoveryDocumentClient.current$
            .pipe(
                take(1),
                switchMap(({ token_endpoint }) =>
                    this.http.post<TokenEndpointResponse>(token_endpoint, payload, { headers: headers })),
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
                    }

                    let decodedToken: DecodedIdentityToken;
                    if (response.id_token) {
                        this.tokenValidation.validateIdTokenFormat(response.id_token);

                        decodedToken = this.tokenHelper.getPayloadFromToken(response.id_token);
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

                    console.info(`Token request succeed
                    AccessToken: ${result.accessToken}
                    AccessTokenExpiresIn: ${result.accessTokenExpiresIn} seconds
                    AccessTokenExpiresAt: ${expiresAt}
                    RefreshToken: ${result.refreshToken || 'no refresh token'}
                    IdentityToken: ${decodedToken ? JSON.stringify(decodedToken) : 'no id token'}`);

                    return result;
                })
            );
    }
}
