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
import { spyOnGet } from '../../test-utils';

describe('OidcCodeFlowClientService', () => {
    let codeFlowClient: OidcCodeFlowClient;
    let windowSpy: CustomMockObject<Window>;
    let authConfigSpy: CustomMockObject<ConfigService<AuthConfig>>;
    let discoveryDocClientSpy: CustomMockObject<OidcDiscoveryDocClient>;
    let tokenStorageSpy: CustomMockObject<TokenStorageService>;
    let discoveryDocSpy: jasmine.Spy<jasmine.Func>;
    let tokenUrlSpy: CustomMockObject<TokenUrlService>;
    let tokenValidationSpy: CustomMockObject<TokenValidationService>;
    let tokenEndpointSpy: CustomMockObject<TokenEndpointClientService>;
    let eventsSpy: CustomMockObject<EventsService>;
    let windowLocationSpy: jasmine.Spy<jasmine.Func>;
    let stateSpy: jasmine.Spy<jasmine.Func>;
    let jwtKeysSpy: jasmine.Spy<jasmine.Func>;

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
        windowSpy = {
            'location': jest.fn(),
            'history': jest.fn()
        };
        authConfigSpy = {
            'current$': jest.fn()
        };
        discoveryDocClientSpy = {
            'current$': jest.fn()
        };
        tokenStorageSpy = {
            'storePreAuthorizationState': jest.fn(),
            'storeAuthorizationCode': jest.fn(),
            'clearPreAuthorizationState': jest.fn(),
            'storeTokens': jest.fn(),
            'storeOriginalIdToken': jest.fn()
        };
        tokenUrlSpy = {
            'createAuthorizeUrl': jest.fn(),
            'parseAuthorizeCallbackParamsFromUrl': jest.fn(),
            'createAuthorizationCodeRequestPayload': jest.fn()
        };
        tokenValidationSpy = {
            'validateIdTokenFormat': jest.fn(),
            'validateIdToken': jest.fn(),
            'validateAccessToken': jest.fn(),
            'validateAuthorizeCallbackFormat': jest.fn(),
            'validateAuthorizeCallbackState': jest.fn()
        };
        tokenEndpointSpy = {
            'call': jest.fn()
        };
        eventsSpy = {
            'dispatch': jest.fn()
        };

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
        discoveryDocSpy.mockReturnValue(of());

        jwtKeysSpy = spyOnGet(TestBed.get(OidcDiscoveryDocClient) as OidcDiscoveryDocClient, 'jwtKeys$');
        jwtKeysSpy.mockReturnValue(of({}));

        codeFlowClient = TestBed.get(OidcCodeFlowClient);

        const configSpy = spyOnGet(TestBed.get(AUTH_CONFIG_SERVICE) as ConfigService<AuthConfig>, 'current$');
        configSpy.mockReturnValue(of(config));

        windowLocationSpy = spyOnGet(TestBed.get(WINDOW_REF) as Window, 'location');
        windowLocationSpy.mockReturnValue({ href: config.baseUrl });
        spyOnGet(TestBed.get(WINDOW_REF) as Window, 'history').mockReturnValue({ pushState: () => { } });

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

            discoveryDocSpy.mockReturnValue(of(doc));

            const urlResult = {
                codeChallenge: 'challenge',
                codeVerifier: 'verifier',
                nonce: 'nonce',
                state: 'state',
                url: 'url'
            };

            tokenUrlSpy.createAuthorizeUrl.mockReturnValue(urlResult);

            const redirectUri = 'redirect';
            const idTokenHint = 'id-token-hint';
            const prompt = 'prompt';

            codeFlowClient.generateCodeFlowMetadata({ redirectUri, idTokenHint, prompt })
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
                });
        }));
    });

    describe('Start Code Flow', () => {

        it('Should store pre authorization request using storage service', fakeAsync(() => {

            const doc: Partial<DiscoveryDocument> = {
                authorization_endpoint: 'http://idp/authorize'
            };

            discoveryDocSpy.mockReturnValue(of(doc));

            tokenStorageSpy.storePreAuthorizationState.mockReturnValue(of());

            const urlResult = {
                codeChallenge: 'challenge',
                codeVerifier: 'verifier',
                nonce: 'nonce',
                state: 'state',
                url: 'url'
            };

            tokenUrlSpy.createAuthorizeUrl.mockReturnValue(urlResult);

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

            discoveryDocSpy.mockReturnValue(of(doc));

            tokenStorageSpy.storePreAuthorizationState.mockReturnValue(of({} as any));

            const urlResult = {
                codeChallenge: 'challenge',
                codeVerifier: 'verifier',
                nonce: 'nonce',
                state: 'state',
                url: 'url'
            };

            tokenUrlSpy.createAuthorizeUrl.mockReturnValue(urlResult);

            const changeUrlSpy = jest.spyOn(codeFlowClient as any, 'redirectToUrl').mockReturnValue(null);

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

            discoveryDocSpy.mockReturnValue(of(doc));

            tokenStorageSpy.storePreAuthorizationState.mockReturnValue(of({} as any));

            const urlResult = {
                codeChallenge: 'challenge',
                codeVerifier: 'verifier',
                nonce: 'nonce',
                state: 'state',
                url: 'url'
            };

            tokenUrlSpy.createAuthorizeUrl.mockReturnValue(urlResult);

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

            discoveryDocSpy.mockReturnValue(of(doc));

            tokenStorageSpy.storePreAuthorizationState.mockReturnValue(of({} as any));

            const urlResult = {
                codeChallenge: 'challenge',
                codeVerifier: 'verifier',
                nonce: 'nonce',
                state: 'state',
                url: 'url'
            };

            tokenUrlSpy.createAuthorizeUrl.mockReturnValue(urlResult);
            const currentLocation = 'http://current-location';
            windowLocationSpy.mockReturnValue({ href: currentLocation });

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

            tokenStorageSpy.storeAuthorizationCode.mockReturnValue(of());
            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl.mockReturnValue({
                    code,
                    state,
                    sessionState,
                    error
                });

            stateSpy.mockReturnValue(of({}));

            codeFlowClient.currentWindowCodeFlowCallback()
                .subscribe();
            flush();

            expect(tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl).toHaveBeenCalledWith(config.baseUrl);

        }));

        it('should throw if url is invalid', fakeAsync(() => {

            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl
                .and.throwError('error');

            stateSpy.mockReturnValue(of({
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

            tokenStorageSpy.storeAuthorizationCode.mockReturnValue(of());
            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl.mockReturnValue({
                    code,
                    state,
                    sessionState,
                    error
                });

            stateSpy.mockReturnValue(of({}));

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

            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl.mockReturnValue({
                    code,
                    state,
                    sessionState,
                    error
                });

            const localState = {
                state: undefined
            };

            stateSpy.mockReturnValue(of(localState));

            tokenStorageSpy.storeAuthorizationCode.mockReturnValue(of());

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

            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl.mockReturnValue({
                    code,
                    state,
                    sessionState,
                    error
                });

            const localState = {};

            stateSpy.mockReturnValue(of(localState));

            tokenStorageSpy.storeAuthorizationCode.mockReturnValue(of());

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

            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl.mockReturnValue({
                    code,
                    state,
                    sessionState,
                    error
                });

            const localState: Partial<LocalState> = {
                authorizationCode: code,
                codeVerifier: 'verifier'
            };

            stateSpy.mockReturnValue(of(localState));

            tokenStorageSpy.storeAuthorizationCode.mockReturnValue(of(localState as any));

            tokenEndpointSpy.call.mockReturnValue(of());

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

            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl.mockReturnValue({
                    code,
                    state,
                    sessionState,
                    error
                });

            const doc: Partial<DiscoveryDocument> = {};

            discoveryDocSpy.mockReturnValue(of(doc));

            const jwtKeys: Partial<JWTKeys> = {};

            jwtKeysSpy.mockReturnValue(of(jwtKeys));

            const localState: Partial<LocalState> = {};

            stateSpy.mockReturnValue(of(localState));

            const freshState: Partial<LocalState> = {
                authorizationCode: code,
                codeVerifier: 'verifier'
            };

            tokenStorageSpy.storeAuthorizationCode.mockReturnValue(of(freshState as any));

            tokenStorageSpy.clearPreAuthorizationState.mockReturnValue(of());

            const tokenResponse: TokenRequestResult = {
                accessToken: 'access-token',
                accessTokenExpiresAt: new Date().getTime(),
                decodedIdToken: {
                    at_hash: 'hash'
                } as any,
                idToken: 'id-token',
                refreshToken: 'refresh-token'
            };

            tokenEndpointSpy.call.mockReturnValue(of(tokenResponse));

            codeFlowClient.currentWindowCodeFlowCallback()
                .subscribe();
            flush();

            expect(tokenValidationSpy.validateIdToken).toHaveBeenCalledWith(
                config.clientId,
                tokenResponse.idToken,
                tokenResponse.decodedIdToken,
                localState.nonce,
                doc as any,
                jwtKeys as any,
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

            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl.mockReturnValue({
                    code,
                    state,
                    sessionState,
                    error
                });

            const doc: Partial<DiscoveryDocument> = {};

            discoveryDocSpy.mockReturnValue(of(doc));

            const jwtKeys: Partial<JWTKeys> = {};

            jwtKeysSpy.mockReturnValue(of(jwtKeys));

            const localState: Partial<LocalState> = {};

            stateSpy.mockReturnValue(of(localState));

            const freshState: Partial<LocalState> = {
                authorizationCode: code,
                codeVerifier: 'verifier'
            };

            tokenStorageSpy.storeAuthorizationCode.mockReturnValue(of(freshState as any));

            tokenStorageSpy.clearPreAuthorizationState.mockReturnValue(of({} as any));
            tokenStorageSpy.storeTokens.mockReturnValue(of({} as any));
            tokenStorageSpy.storeOriginalIdToken.mockReturnValue(of({} as any));

            const tokenResponse: TokenRequestResult = {
                accessToken: 'access-token',
                accessTokenExpiresAt: new Date().getTime(),
                decodedIdToken: {
                    at_hash: 'hash'
                } as any,
                idToken: 'id-token',
                refreshToken: 'refresh-token'
            };

            tokenEndpointSpy.call.mockReturnValue(of(tokenResponse));

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

            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl.mockReturnValue({
                    code,
                    state,
                    sessionState,
                    error
                });

            const doc: Partial<DiscoveryDocument> = {};

            discoveryDocSpy.mockReturnValue(of(doc));

            const jwtKeys: Partial<JWTKeys> = {};

            jwtKeysSpy.mockReturnValue(of(jwtKeys));

            const localState: Partial<LocalState> = {
                preRedirectUrl: 'http://pre-redirect-uri'
            };

            stateSpy.mockReturnValue(of(localState));

            const freshState: Partial<LocalState> = {
                authorizationCode: code,
                codeVerifier: 'verifier'
            };

            tokenStorageSpy.storeAuthorizationCode.mockReturnValue(of(freshState as any));

            tokenStorageSpy.clearPreAuthorizationState.mockReturnValue(of({} as any));
            tokenStorageSpy.storeTokens.mockReturnValue(of({} as any));
            tokenStorageSpy.storeOriginalIdToken.mockReturnValue(of({} as any));

            const tokenResponse: TokenRequestResult = {
                accessToken: 'access-token',
                accessTokenExpiresAt: new Date().getTime(),
                decodedIdToken: {
                    at_hash: 'hash'
                } as any,
                idToken: 'id-token',
                refreshToken: 'refresh-token'
            };

            tokenEndpointSpy.call.mockReturnValue(of(tokenResponse));

            const changeUrlSpy = jest.spyOn(codeFlowClient as any, 'historyChangeUrl').mockReturnValue(null);

            codeFlowClient.currentWindowCodeFlowCallback()
                .subscribe();
            flush();

            expect(changeUrlSpy).toHaveBeenCalledWith(localState.preRedirectUrl);
        }));

    });

});
