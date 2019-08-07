import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { TokenCryptoService } from './token-crypto.service';
import { validateObjectRequiredProps } from '../utils/validate-object-required-props';

@Injectable()
export class TokenUrlService {

    constructor(protected readonly tokenCrypto: TokenCryptoService) { }

    public createAuthorizationCodeRequestPayload(params: {
        clientId: string,
        clientSecret: string,
        scope?: string,
        redirectUri: string,
        codeVerifier: string,
        code: string,
        acrValues?: string,
    }) {
        let httpParams = new HttpParams()
            .set('client_id', params.clientId)
            .set('client_secret', params.clientSecret)
            .set('grant_type', 'authorization_code')
            .set('code_verifier', params.codeVerifier)
            .set('code', params.code)
            .set('redirect_uri', params.redirectUri);

        if (params.scope) {
            httpParams = httpParams
                .set('scope', params.scope);
        }

        if (params.acrValues) {
            httpParams = httpParams
                .set('acr_values', params.acrValues);
        }

        console.info(`Generating Authorization Code Payload:
            CodeVerifier: ${httpParams.get('code_verifier')}
            Code: ${httpParams.get('code')}
            ${httpParams}`);


        return httpParams.toString();
    }

    public createRefreshTokenRequestPayload(params: {
        clientId: string,
        clientSecret: string,
        scope?: string,
        refreshToken: string,
        acrValues?: string,
    }) {
        let httpParams = new HttpParams()
            .set('client_id', params.clientId)
            .set('client_secret', params.clientSecret)
            .set('grant_type', 'refresh_token')
            .set('refresh_token', params.refreshToken);

        if (params.scope) {
            httpParams = httpParams
                .set('scope', params.scope);
        }

        if (params.acrValues) {
            httpParams = httpParams
                .set('acr_values', params.acrValues);
        }

        console.info(`Generating Refresh Token Payload:
            RefreshToken: ${httpParams.get('refresh_token')}
            ${httpParams}`);

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

    public parseAuthorizeCallbackParamsFromUrl(url: string) {
        if (!url || !url.length) {
            throw new Error(`url is required`);
        }
        const paramsError = new Error(`url has no params`);

        if (!url.includes('?')) {
            throw paramsError;
        }

        const params = new HttpParams({
            fromString: url.split('?')[1],
        });

        if (!params.keys().length) {
            throw paramsError;
        }

        return {
            code: params.get('code'),
            state: params.get('state'),
            error: params.get('error'),
            sessionState: params.get('session_state')
        };
    }
}
