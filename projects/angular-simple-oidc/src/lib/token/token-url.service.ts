import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { TokenCryptoService } from './token-crypto.service';
import { validateObjectRequiredProps } from '../utils/validate-object-required-props';

@Injectable()
export class TokenUrlService {

    constructor(protected readonly tokenCrypto: TokenCryptoService) { }

    public createTokenRequestPayload(params: {
        clientId: string,
        clientSecret: string,
        scope: string,
        redirectUri: string,
        grantType: 'authorization_code' | 'refresh_token',
        codeVerifier: string,
        code: string,
        refreshToken?: string,
        acrValues?: string,
    }) {
        const httpParams = new HttpParams()
            .set('client_id', params.clientId)
            .set('client_secret', params.clientSecret)
            .set('scope', params.scope)
            .set('redirect_uri', params.redirectUri)
            .set('grant_type', params.grantType)
            .set('code_verifier', params.codeVerifier)
            .set('code', params.code)
            .set('refresh_token', params.refreshToken)
            .set('acr_values', params.acrValues)

        console.info(`Generating TokenRequest Payload:
        CodeVerifier: ${httpParams.get('code_verifier')}
        Code: ${httpParams.get('code')}`);
        return httpParams.toString();
    }

    public createAuthorizeUrl(
        authorizeEndpointUrl: string,
        params: {
            clientId: string,
            scope: string,
            redirectUri: string,
            prompt?: string,
            loginHint?: string,
            uiLocales?: string,
            acrValues?: string
            responseType: 'code' | 'token' | 'id_token token'
        }) {

        if (!authorizeEndpointUrl || !authorizeEndpointUrl.length) {
            throw new Error(`authorizeEndpointUrl is required`);
        }

        if (!params) {
            throw new Error(`params are required`);
        }

        validateObjectRequiredProps(params, ['clientId', 'redirectUri', 'scope', 'responseType']);

        const state = this.tokenCrypto.generateState();
        const nonce = this.tokenCrypto.generateNonce();
        const verification = this.tokenCrypto.generateCodesForCodeVerification();

        const httpParams = new HttpParams({ fromObject: params })
            .set('client_id', params.clientId)
            .set('scope', params.scope)
            .set('redirect_uri', params.redirectUri)
            .set('response_type', params.responseType)
            .set('state', state)
            .set('nonce', nonce)
            .set('code_challenge', verification.codeChallenge)
            .set('code_challenge_method', verification.method);

        const url = `${authorizeEndpointUrl}?${httpParams}`;

        console.info(`Generated Authorize URL:
        State: ${state}
        Nonce: ${nonce}
        CodeVerifier: ${verification.codeVerifier}
        Challenge: ${verification.codeChallenge}
        URL: ${url}`);

        return {
            nonce,
            state,
            codeVerifier: verification.codeVerifier,
            codeChallenge: verification.codeChallenge,
            url,
        };
    }
}
