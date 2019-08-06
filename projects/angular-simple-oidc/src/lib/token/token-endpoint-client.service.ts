import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { switchMap, take, map } from 'rxjs/operators';
import { TokenRequestResult, DecodedIdentityToken } from './models';
import { TokenValidationService } from './token-validation.service';
import { OidcDiscoveryDocClient } from '../discovery-document/oidc-discovery-doc-client.service';
import { TokenHelperService } from './token-helper.service';
import { ValidationResult } from './validation-result';

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
                map(response => {
                    if (response.error) {
                        throw {
                            success: false,
                            // TODO: use messages from https://tools.ietf.org/html/rfc6749#section-5.2
                            message: response.error,
                            errorCode: response.error
                        } as ValidationResult;
                    }
                    let expiresAt: Date;
                    if (response.expires_in) {
                        expiresAt = this.tokenHelper.getExpirationFromExpiresIn(response.expires_in);
                    }

                    let decodedToken: DecodedIdentityToken;
                    if (response.id_token) {
                        const formatValidationResult = this.tokenValidation.validateIdTokenFormat(response.id_token);
                        if (!formatValidationResult.success) {
                            throw formatValidationResult;
                        }

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
