import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { TokenEndpointClientService } from './token-endpoint-client.service';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import {
    TokenValidationService,
    DiscoveryDocument,
    LocalState,
    JWTKeys,
    TokenRequestResult,
    AuthorizationCallbackFormatError,
    TokenUrlService
} from 'angular-simple-oidc/core';
import { of } from 'rxjs';
import { OidcCodeFlowClient } from './oidc-code-flow-client.service';
import { WINDOW_REF, AUTH_CONFIG_SERVICE } from './providers';
import { TokenStorageService } from './token-storage.service';
import { EventsService } from 'angular-simple-oidc/events';
import { AuthConfig } from './config/models';
import { TokensReadyEvent } from './auth.events';
import { ConfigService } from 'angular-simple-oidc/config';
import { urlJoin } from './utils/url-join';

function spyOnGet<T>(obj: T, property: keyof T) {
    Object.defineProperty(obj, property, { get: () => null });
    return spyOnProperty(obj, property, 'get');
}

describe('OidcCodeFlowClientService', () => {
    let codeFlowClient: OidcCodeFlowClient;
    let windowSpy: jasmine.SpyObj<Window>;
    let authConfigSpy: jasmine.SpyObj<ConfigService<AuthConfig>>;
    let discoveryDocClientSpy: jasmine.SpyObj<OidcDiscoveryDocClient>;
    let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;
    let discoveryDocSpy: jasmine.Spy<InferableFunction>;
    let tokenUrlSpy: jasmine.SpyObj<TokenUrlService>;
    let tokenValidationSpy: jasmine.SpyObj<TokenValidationService>;
    let tokenEndpointSpy: jasmine.SpyObj<TokenEndpointClientService>;
    let eventsSpy: jasmine.SpyObj<EventsService>;
    let windowLocationSpy: jasmine.Spy<InferableFunction>;
    let stateSpy: jasmine.Spy<InferableFunction>;
    let jwtKeysSpy: jasmine.Spy<InferableFunction>;

    const config: Partial<AuthConfig> = {
        clientId: 'client.id',
        clientSecret: 'secret',
        scope: 'scope',
        openIDProviderUrl: 'http://idp',
        discoveryDocumentUrl: '/discovery',
        tokenCallbackRoute: '/callback',
        tokenValidation: {
            disableIdTokenIATValidation: false,
            idTokenIATOffsetAllowed: 3000
        },
        baseUrl: 'http://base-url/',
    };

    beforeEach(() => {
        windowSpy = jasmine.createSpyObj('window', ['location', 'history']);
        authConfigSpy = jasmine.createSpyObj('AuthConfigService', ['current$']);
        discoveryDocClientSpy = jasmine.createSpyObj('OidcDiscoveryDocClient', ['current$']);
        tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', [
            'storePreAuthorizationState',
            'storeAuthorizationCode',
            'clearPreAuthorizationState',
            'storeTokens',
            'storeOriginalIdToken']);
        tokenUrlSpy = jasmine.createSpyObj('TokenUrlService', [
            'createAuthorizeUrl',
            'parseAuthorizeCallbackParamsFromUrl',
            'createAuthorizationCodeRequestPayload']);
        tokenValidationSpy = jasmine.createSpyObj('TokenValidationService', [
            'validateIdTokenFormat',
            'validateIdToken',
            'validateAccessToken',
            'validateAuthorizeCallbackFormat',
            'validateAuthorizeCallbackState']);
        tokenEndpointSpy = jasmine.createSpyObj('TokenEndpointClientService', ['call']);
        eventsSpy = jasmine.createSpyObj('EventsService', ['dispatch']);

        TestBed.configureTestingModule({
            providers: [
                {
                    provide: WINDOW_REF,
                    useValue: windowSpy
                },
                {
                    provide: AUTH_CONFIG_SERVICE,
                    useValue: authConfigSpy
                },
                {
                    provide: OidcDiscoveryDocClient,
                    useValue: discoveryDocClientSpy,
                },
                {
                    provide: TokenStorageService,
                    useValue: tokenStorageSpy,
                },
                {
                    provide: TokenValidationService,
                    useValue: tokenValidationSpy,
                },
                {
                    provide: TokenUrlService,
                    useValue: tokenUrlSpy
                },
                {
                    provide: TokenEndpointClientService,
                    useValue: tokenEndpointSpy
                },
                {
                    provide: EventsService,
                    useValue: eventsSpy
                },
                OidcCodeFlowClient
            ],
        });

        discoveryDocSpy = spyOnGet(TestBed.get(OidcDiscoveryDocClient) as OidcDiscoveryDocClient, 'current$');
        discoveryDocSpy.and.returnValue(of());

        jwtKeysSpy = spyOnGet(TestBed.get(OidcDiscoveryDocClient) as OidcDiscoveryDocClient, 'jwtKeys$');
        jwtKeysSpy.and.returnValue(of({}));

        codeFlowClient = TestBed.get(OidcCodeFlowClient);

        const configSpy = spyOnGet(TestBed.get(AUTH_CONFIG_SERVICE) as ConfigService<AuthConfig>, 'current$');
        configSpy.and.returnValue(of(config));

        windowLocationSpy = spyOnGet(TestBed.get(WINDOW_REF) as Window, 'location');
        windowLocationSpy.and.returnValue({ href: config.baseUrl });
        spyOnGet(TestBed.get(WINDOW_REF) as Window, 'history').and.returnValue({ pushState: () => { } });

        stateSpy = spyOnGet(TestBed.get(TokenStorageService) as TokenStorageService, 'currentState$');
    });

    it('should create', () => {
        expect(codeFlowClient).toBeTruthy();
    });


    describe('generateCodeFlowMetadata', () => {

        it('Should use Discovery Document for obtaining authorize URL', fakeAsync(() => {

            const doc: Partial<DiscoveryDocument> = {
                authorization_endpoint: 'http://idp/authorize'
            };

            discoveryDocSpy.and.returnValue(of(doc));

            const urlResult = {
                codeChallenge: 'challenge',
                codeVerifier: 'verifier',
                nonce: 'nonce',
                state: 'state',
                url: 'url'
            };

            tokenUrlSpy.createAuthorizeUrl.and.returnValue(urlResult);

            const redirectUri = 'redirect';
            const idTokenHint = 'id-token-hint';
            const prompt = 'prompt';

            codeFlowClient.generateCodeFlowMetadata(redirectUri, idTokenHint, prompt)
                .subscribe();
            flush();

            expect(tokenUrlSpy.createAuthorizeUrl)
                .toHaveBeenCalledWith(doc.authorization_endpoint, {
                    clientId: config.clientId,
                    responseType: 'code',
                    scope: config.scope,
                    redirectUri: redirectUri,
                    idTokenHint: idTokenHint,
                    prompt: prompt,
                    display: undefined
                });
        }));
    });

    describe('Start Code Flow', () => {

        it('Should store pre authorization request using storage service', fakeAsync(() => {

            const doc: Partial<DiscoveryDocument> = {
                authorization_endpoint: 'http://idp/authorize'
            };

            discoveryDocSpy.and.returnValue(of(doc));

            tokenStorageSpy.storePreAuthorizationState.and.returnValue(of());

            const urlResult = {
                codeChallenge: 'challenge',
                codeVerifier: 'verifier',
                nonce: 'nonce',
                state: 'state',
                url: 'url'
            };

            tokenUrlSpy.createAuthorizeUrl.and.returnValue(urlResult);

            codeFlowClient.startCodeFlow()
                .subscribe();
            flush();

            expect(tokenStorageSpy.storePreAuthorizationState)
                .toHaveBeenCalledWith({
                    nonce: urlResult.nonce,
                    state: urlResult.state,
                    codeVerifier: urlResult.codeVerifier,
                    preRedirectUrl: config.baseUrl
                });
        }));

        it('Should change the URL after storing pre-auth state', fakeAsync(() => {

            const doc: Partial<DiscoveryDocument> = {
                authorization_endpoint: 'http://idp/authorize'
            };

            discoveryDocSpy.and.returnValue(of(doc));

            tokenStorageSpy.storePreAuthorizationState.and.returnValue(of({} as any));

            const urlResult = {
                codeChallenge: 'challenge',
                codeVerifier: 'verifier',
                nonce: 'nonce',
                state: 'state',
                url: 'url'
            };

            tokenUrlSpy.createAuthorizeUrl.and.returnValue(urlResult);

            const changeUrlSpy = spyOn(codeFlowClient as any, 'redirectToUrl')
                .and.returnValue(null);

            codeFlowClient.startCodeFlow()
                .subscribe();
            flush();

            expect(tokenStorageSpy.storePreAuthorizationState).toHaveBeenCalled();
            expect(changeUrlSpy).toHaveBeenCalledWith(urlResult.url);
        }));

        it('Should store provided return URL in storage', fakeAsync(() => {

            const doc: Partial<DiscoveryDocument> = {
                authorization_endpoint: 'http://idp/authorize'
            };

            discoveryDocSpy.and.returnValue(of(doc));

            tokenStorageSpy.storePreAuthorizationState.and.returnValue(of({} as any));

            const urlResult = {
                codeChallenge: 'challenge',
                codeVerifier: 'verifier',
                nonce: 'nonce',
                state: 'state',
                url: 'url'
            };

            tokenUrlSpy.createAuthorizeUrl.and.returnValue(urlResult);

            const returnUrl = 'http://return-url';

            codeFlowClient.startCodeFlow({
                returnUrlAfterCallback: returnUrl
            })
                .subscribe();
            flush();

            expect(tokenStorageSpy.storePreAuthorizationState).toHaveBeenCalledWith({
                nonce: urlResult.nonce,
                state: urlResult.state,
                codeVerifier: urlResult.codeVerifier,
                preRedirectUrl: returnUrl
            });
        }));

        it('Should default to current url for return url', fakeAsync(() => {

            const doc: Partial<DiscoveryDocument> = {
                authorization_endpoint: 'http://idp/authorize'
            };

            discoveryDocSpy.and.returnValue(of(doc));

            tokenStorageSpy.storePreAuthorizationState.and.returnValue(of({} as any));

            const urlResult = {
                codeChallenge: 'challenge',
                codeVerifier: 'verifier',
                nonce: 'nonce',
                state: 'state',
                url: 'url'
            };

            tokenUrlSpy.createAuthorizeUrl.and.returnValue(urlResult);
            const currentLocation = 'http://current-location';
            windowLocationSpy.and.returnValue({ href: currentLocation });

            codeFlowClient.startCodeFlow()
                .subscribe();
            flush();

            expect(tokenStorageSpy.storePreAuthorizationState).toHaveBeenCalledWith({
                nonce: urlResult.nonce,
                state: urlResult.state,
                codeVerifier: urlResult.codeVerifier,
                preRedirectUrl: currentLocation
            });
        }));
    });

    describe('Code Flow Callback', () => {

        it('should parse params from URL using helper', fakeAsync(() => {

            const state = 'state';
            const code = 'code';
            const sessionState = 'session-state';
            const error = null;

            tokenStorageSpy.storeAuthorizationCode.and.returnValue(of());
            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl
                .and.returnValue({
                    code,
                    state,
                    sessionState,
                    error
                });

            stateSpy.and.returnValue(of({}));

            codeFlowClient.currentWindowCodeFlowCallback()
                .subscribe();
            flush();

            expect(tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl).toHaveBeenCalledWith(config.baseUrl);

        }));

        it('should throw if url is invalid', fakeAsync(() => {

            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl
                .and.throwError('error');

            stateSpy.and.returnValue(of({
                state: null
            }));

            expect(() => {
                codeFlowClient.currentWindowCodeFlowCallback()
                    .subscribe();
                flush();
            }).toThrowError(AuthorizationCallbackFormatError);

            expect(tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl).toHaveBeenCalledWith(config.baseUrl);

        }));

        it('should validate URL parameters using validation service', fakeAsync(() => {

            const state = 'state';
            const code = 'code';
            const sessionState = 'session-state';
            const error = null;

            tokenStorageSpy.storeAuthorizationCode.and.returnValue(of());
            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl
                .and.returnValue({
                    code,
                    state,
                    sessionState,
                    error
                });

            stateSpy.and.returnValue(of({}));

            codeFlowClient.currentWindowCodeFlowCallback()
                .subscribe();
            flush();

            expect(tokenValidationSpy.validateAuthorizeCallbackFormat)
                .toHaveBeenCalledWith(code, state, error, config.baseUrl);

        }));

        it('should validate local state using validation service', fakeAsync(() => {

            const state = 'state';
            const code = 'code';
            const sessionState = 'session-state';
            const error = null;

            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl
                .and.returnValue({
                    code,
                    state,
                    sessionState,
                    error
                });

            const localState = {
                state: undefined
            };

            stateSpy.and.returnValue(of(localState));

            tokenStorageSpy.storeAuthorizationCode.and.returnValue(of());

            codeFlowClient.currentWindowCodeFlowCallback()
                .subscribe();
            flush();

            expect(tokenValidationSpy.validateAuthorizeCallbackState).toHaveBeenCalledWith(localState.state, state);
        }));

        it('should store code using storage service', fakeAsync(() => {

            const state = 'state';
            const code = 'code';
            const sessionState = 'session-state';
            const error = null;

            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl
                .and.returnValue({
                    code,
                    state,
                    sessionState,
                    error
                });

            const localState = {};

            stateSpy.and.returnValue(of(localState));

            tokenStorageSpy.storeAuthorizationCode.and.returnValue(of());

            codeFlowClient.currentWindowCodeFlowCallback()
                .subscribe();
            flush();

            expect(tokenStorageSpy.storeAuthorizationCode).toHaveBeenCalledWith(code, sessionState);
        }));

    });

    describe('Request Token using Authorization Code', () => {
        it('should use token url to generate token endpoint url', fakeAsync(() => {

            const state = 'state';
            const code = 'code';
            const sessionState = 'session-state';
            const error = null;

            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl
                .and.returnValue({
                    code,
                    state,
                    sessionState,
                    error
                });

            const localState: Partial<LocalState> = {
                authorizationCode: code,
                codeVerifier: 'verifier'
            };

            stateSpy.and.returnValue(of(localState));

            tokenStorageSpy.storeAuthorizationCode.and.returnValue(of(localState as any));

            tokenEndpointSpy.call.and.returnValue(of());

            codeFlowClient.currentWindowCodeFlowCallback()
                .subscribe();
            flush();

            expect(tokenUrlSpy.createAuthorizationCodeRequestPayload).toHaveBeenCalledWith({
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                scope: config.scope,
                redirectUri: urlJoin(config.baseUrl, config.tokenCallbackRoute),
                code: code,
                codeVerifier: localState.codeVerifier
            });
        }));

        it('should validate tokens using validation service', fakeAsync(() => {

            const state = 'state';
            const code = 'code';
            const sessionState = 'session-state';
            const error = null;

            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl
                .and.returnValue({
                    code,
                    state,
                    sessionState,
                    error
                });

            const doc: Partial<DiscoveryDocument> = {};

            discoveryDocSpy.and.returnValue(of(doc));

            const jwtKeys: Partial<JWTKeys> = {};

            jwtKeysSpy.and.returnValue(of(jwtKeys));

            const localState: Partial<LocalState> = {};

            stateSpy.and.returnValue(of(localState));

            const freshState: Partial<LocalState> = {
                authorizationCode: code,
                codeVerifier: 'verifier'
            };

            tokenStorageSpy.storeAuthorizationCode.and.returnValue(of(freshState as any));

            tokenStorageSpy.clearPreAuthorizationState.and.returnValue(of());

            const tokenResponse: TokenRequestResult = {
                accessToken: 'access-token',
                accessTokenExpiresAt: new Date().getTime(),
                decodedIdToken: {
                    at_hash: 'hash'
                } as any,
                idToken: 'id-token',
                refreshToken: 'refresh-token'
            };

            tokenEndpointSpy.call.and.returnValue(of(tokenResponse));

            codeFlowClient.currentWindowCodeFlowCallback()
                .subscribe();
            flush();

            expect(tokenValidationSpy.validateIdToken).toHaveBeenCalledWith(
                config.clientId,
                tokenResponse.idToken,
                tokenResponse.decodedIdToken,
                localState.nonce,
                doc,
                jwtKeys,
                config.tokenValidation
            );

            expect(tokenValidationSpy.validateAccessToken).toHaveBeenCalledWith(
                tokenResponse.accessToken,
                tokenResponse.decodedIdToken.at_hash
            );
        }));

        it('should clear pre auth state and store new state', fakeAsync(() => {

            const state = 'state';
            const code = 'code';
            const sessionState = 'session-state';
            const error = null;

            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl
                .and.returnValue({
                    code,
                    state,
                    sessionState,
                    error
                });

            const doc: Partial<DiscoveryDocument> = {};

            discoveryDocSpy.and.returnValue(of(doc));

            const jwtKeys: Partial<JWTKeys> = {};

            jwtKeysSpy.and.returnValue(of(jwtKeys));

            const localState: Partial<LocalState> = {};

            stateSpy.and.returnValue(of(localState));

            const freshState: Partial<LocalState> = {
                authorizationCode: code,
                codeVerifier: 'verifier'
            };

            tokenStorageSpy.storeAuthorizationCode.and.returnValue(of(freshState as any));

            tokenStorageSpy.clearPreAuthorizationState.and.returnValue(of({} as any));
            tokenStorageSpy.storeTokens.and.returnValue(of({} as any));
            tokenStorageSpy.storeOriginalIdToken.and.returnValue(of({} as any));

            const tokenResponse: TokenRequestResult = {
                accessToken: 'access-token',
                accessTokenExpiresAt: new Date().getTime(),
                decodedIdToken: {
                    at_hash: 'hash'
                } as any,
                idToken: 'id-token',
                refreshToken: 'refresh-token'
            };

            tokenEndpointSpy.call.and.returnValue(of(tokenResponse));

            codeFlowClient.currentWindowCodeFlowCallback()
                .subscribe();
            flush();

            expect(tokenStorageSpy.clearPreAuthorizationState).toHaveBeenCalled();

            expect(tokenStorageSpy.storeTokens).toHaveBeenCalledWith(tokenResponse);
            expect(tokenStorageSpy.storeOriginalIdToken).toHaveBeenCalledWith(tokenResponse.idToken);

            expect(eventsSpy.dispatch).toHaveBeenCalledWith(new TokensReadyEvent(tokenResponse));
        }));

        it('should redirect to original state using router', fakeAsync(() => {

            const state = 'state';
            const code = 'code';
            const sessionState = 'session-state';
            const error = null;

            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl
                .and.returnValue({
                    code,
                    state,
                    sessionState,
                    error
                });

            const doc: Partial<DiscoveryDocument> = {};

            discoveryDocSpy.and.returnValue(of(doc));

            const jwtKeys: Partial<JWTKeys> = {};

            jwtKeysSpy.and.returnValue(of(jwtKeys));

            const localState: Partial<LocalState> = {
                preRedirectUrl: 'http://pre-redirect-uri'
            };

            stateSpy.and.returnValue(of(localState));

            const freshState: Partial<LocalState> = {
                authorizationCode: code,
                codeVerifier: 'verifier'
            };

            tokenStorageSpy.storeAuthorizationCode.and.returnValue(of(freshState as any));

            tokenStorageSpy.clearPreAuthorizationState.and.returnValue(of({} as any));
            tokenStorageSpy.storeTokens.and.returnValue(of({} as any));
            tokenStorageSpy.storeOriginalIdToken.and.returnValue(of({} as any));

            const tokenResponse: TokenRequestResult = {
                accessToken: 'access-token',
                accessTokenExpiresAt: new Date().getTime(),
                decodedIdToken: {
                    at_hash: 'hash'
                } as any,
                idToken: 'id-token',
                refreshToken: 'refresh-token'
            };

            tokenEndpointSpy.call.and.returnValue(of(tokenResponse));

            const changeUrlSpy = spyOn(codeFlowClient as any, 'historyChangeUrl')
                .and.returnValue(null);

            codeFlowClient.currentWindowCodeFlowCallback()
                .subscribe();
            flush();

            expect(changeUrlSpy).toHaveBeenCalledWith(localState.preRedirectUrl);
        }));

    });

});
