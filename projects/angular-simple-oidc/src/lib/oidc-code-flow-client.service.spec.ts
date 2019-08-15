import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { TokenEndpointClientService } from './token-endpoint-client.service';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import { TokenValidationService } from './core/token-validation.service';
import { DiscoveryDocument, LocalState, JWTKeys } from './core/models';
import { of } from 'rxjs';
import { TokenRequestResult } from './core/models';
import { AuthorizationCallbackFormatError } from './core/token-validation-errors';
import { OidcCodeFlowClient } from './oidc-code-flow-client.service';
import { WINDOW_REF } from './constants';
import { AuthConfigService } from './config/auth-config.service';
import { TokenStorageService } from './token-storage.service';
import { TokenUrlService } from './core/token-url.service';
import { EventsService } from './events/events.service';
import { AuthConfig } from './config/models';
import { TokensReadyEvent } from './auth.events';

function spyOnGet<T>(obj: T, property: keyof T) {
    Object.defineProperty(obj, property, { get: () => null });
    return spyOnProperty(obj, property, 'get');
}

describe('OidcCodeFlowClientService', () => {
    let codeFlowClient: OidcCodeFlowClient;
    let windowSpy: jasmine.SpyObj<Window>;
    let authConfigSpy: jasmine.SpyObj<AuthConfigService>;
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
        }
    };

    const baseUrl = 'http://base-url/';

    beforeEach(() => {
        windowSpy = jasmine.createSpyObj('window', ['location']);
        authConfigSpy = jasmine.createSpyObj('AuthConfigService', ['configuration']);
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
                    provide: AuthConfigService,
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

        const configSpy = spyOnGet(TestBed.get(AuthConfigService) as AuthConfigService, 'configuration');
        configSpy.and.returnValue(config);

        const baseUrlSpy = spyOnGet(TestBed.get(AuthConfigService) as AuthConfigService, 'baseUrl');
        baseUrlSpy.and.returnValue(baseUrl);

        windowLocationSpy = spyOnGet(TestBed.get(WINDOW_REF) as Window, 'location');
        windowLocationSpy.and.returnValue({ href: baseUrl });

        stateSpy = spyOnGet(TestBed.get(TokenStorageService) as TokenStorageService, 'currentState$');
    });

    it('should create', () => {
        expect(codeFlowClient).toBeTruthy();
    });

    describe('Start Code Flow', () => {

        it('Should use Discovery Document for authorize endpoint', fakeAsync(() => {

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

            expect(tokenUrlSpy.createAuthorizeUrl)
                .toHaveBeenCalledWith(doc.authorization_endpoint, {
                    clientId: config.clientId,
                    responseType: 'code',
                    scope: config.scope,
                    redirectUri: `${baseUrl}callback`
                });
        }));

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
                    preRedirectUrl: baseUrl
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

            const changeUrlSpy = spyOn(codeFlowClient as any, 'changeUrl')
                .and.returnValue(null);

            codeFlowClient.startCodeFlow()
                .subscribe();
            flush();

            expect(tokenStorageSpy.storePreAuthorizationState).toHaveBeenCalled();
            expect(changeUrlSpy).toHaveBeenCalledWith(urlResult.url);
        }));
    });

    describe('Code Flow Callback', () => {

        it('should parse params from URL using helper', () => {

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

            stateSpy.and.returnValue(of());

            codeFlowClient.codeFlowCallback();

            expect(tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl).toHaveBeenCalledWith(baseUrl);

        });

        it('should throw if url is invalid', () => {

            tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl
                .and.throwError('error');

            stateSpy.and.returnValue(of());

            expect(() => codeFlowClient.codeFlowCallback())
                .toThrowError(AuthorizationCallbackFormatError);

            expect(tokenUrlSpy.parseAuthorizeCallbackParamsFromUrl).toHaveBeenCalledWith(baseUrl);

        });

        it('should validate URL parameters using validation service', () => {

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

            stateSpy.and.returnValue(of());

            codeFlowClient.codeFlowCallback();

            expect(tokenValidationSpy.validateAuthorizeCallbackFormat).toHaveBeenCalledWith(code, state, error, baseUrl);

        });

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

            const localState = {};

            stateSpy.and.returnValue(of(localState));

            tokenStorageSpy.storeAuthorizationCode.and.returnValue(of());

            codeFlowClient.codeFlowCallback()
                .subscribe();
            flush();

            expect(tokenValidationSpy.validateAuthorizeCallbackState).toHaveBeenCalledWith(localState, state);
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

            codeFlowClient.codeFlowCallback()
                .subscribe();
            flush();

            expect(tokenStorageSpy.storeAuthorizationCode).toHaveBeenCalledWith(code);
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

            const localState = {};

            stateSpy.and.returnValue(of(localState));

            const freshState: Partial<LocalState> = {
                authorizationCode: code,
                codeVerifier: 'verifier'
            };

            tokenStorageSpy.storeAuthorizationCode.and.returnValue(of(freshState as any));

            tokenEndpointSpy.call.and.returnValue(of());

            codeFlowClient.codeFlowCallback()
                .subscribe();
            flush();

            expect(tokenUrlSpy.createAuthorizationCodeRequestPayload).toHaveBeenCalledWith({
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                scope: config.scope,
                redirectUri: baseUrl,
                code: code,
                codeVerifier: freshState.codeVerifier
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

            codeFlowClient.codeFlowCallback()
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

            codeFlowClient.codeFlowCallback()
                .subscribe();
            flush();

            expect(tokenStorageSpy.clearPreAuthorizationState).toHaveBeenCalled();

            expect(tokenStorageSpy.storeTokens).toHaveBeenCalledWith(tokenResponse);
            expect(tokenStorageSpy.storeOriginalIdToken).toHaveBeenCalledWith(tokenResponse.idToken);

            expect(eventsSpy.dispatch).toHaveBeenCalledWith(new TokensReadyEvent(tokenResponse));
        }));

    });

});
