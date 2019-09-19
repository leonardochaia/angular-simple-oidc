import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { TokenCryptoService } from './token-crypto.service';
import { validateObjectRequiredProps } from './validate-object-required-props';
import { RequiredParemetersMissingError } from './errors';

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
            responseType: 'code' | 'token' | 'id_token token',
            idTokenHint?: string,
            display?: string
        }) {

        if (!authorizeEndpointUrl || !authorizeEndpointUrl.length) {
            throw new RequiredParemetersMissingError(`authorizeEndpointUrl`, arguments);
        }

        if (!params) {
            throw new RequiredParemetersMissingError(`params`, arguments);
        }

        validateObjectRequiredProps(params, ['clientId', 'redirectUri', 'scope', 'responseType']);

        const state = this.tokenCrypto.generateState();
        const nonce = this.tokenCrypto.generateNonce();
        const verification = this.tokenCrypto.generateCodesForCodeVerification();

        let httpParams = new HttpParams()
            .set('client_id', params.clientId)
            .set('scope', params.scope)
            .set('redirect_uri', params.redirectUri)
            .set('response_type', params.responseType)
            .set('state', state)
            .set('nonce', nonce)
            .set('code_challenge', verification.codeChallenge)
            .set('code_challenge_method', verification.method);

        if (params.prompt) {
            httpParams = httpParams.set('prompt', params.prompt);
        }

        if (params.loginHint) {
            httpParams = httpParams.set('login_hint', params.loginHint);
        }

        if (params.uiLocales) {
            httpParams = httpParams.set('ui_locales', params.uiLocales);
        }

        if (params.acrValues) {
            httpParams = httpParams.set('acr_values', params.acrValues);
        }

        if (params.idTokenHint) {
            httpParams = httpParams.set('id_token_hint', params.idTokenHint);
        }

        const url = `${authorizeEndpointUrl}?${httpParams}`;

        return {
            nonce,
            state,
            codeVerifier: verification.codeVerifier,
            codeChallenge: verification.codeChallenge,
            url,
        };
    }

    public createEndSessionUrl(
        endSessionEndpointUrl: string,
        params: {
            idTokenHint?: string,
            postLogoutRedirectUri?: string,
        } = {}) {

        if (!endSessionEndpointUrl || !endSessionEndpointUrl.length) {
            throw new RequiredParemetersMissingError(`endSessionEndpointUrl`, arguments);
        }

        const state = this.tokenCrypto.generateState();
        let httpParams = new HttpParams()
            .set('state', state);

        if (params.idTokenHint) {
            httpParams = httpParams
                .set('id_token_hint', params.idTokenHint);
        }

        if (params.postLogoutRedirectUri) {
            httpParams = httpParams
                .set('post_logout_redirect_uri', params.postLogoutRedirectUri);
        }

        const url = `${endSessionEndpointUrl}?${httpParams}`;
        return {
            url,
            state
        };
    }

    public parseAuthorizeCallbackParamsFromUrl(url: string) {
        if (!url || !url.length) {
            throw new RequiredParemetersMissingError(`url`, arguments);
        }

        const paramsError = new RequiredParemetersMissingError(`url must have params`, arguments);

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
