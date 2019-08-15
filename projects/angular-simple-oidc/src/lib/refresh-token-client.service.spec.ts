import { TestBed, flush, fakeAsync } from '@angular/core/testing';
import { TokenEndpointClientService } from './token-endpoint-client.service';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import { TokenValidationService } from './core/token-validation.service';
import { of } from 'rxjs';
import { AuthConfigService } from './config/auth-config.service';
import { TokenStorageService } from './token-storage.service';
import { TokenUrlService } from './core/token-url.service';
import { EventsService } from './events/events.service';
import { AuthConfig } from './config/models';
import { RefreshTokenValidationService } from './core/refresh-token/refresh-token-validation.service';
import { RefreshTokenClient } from './refresh-token-client.service';
import { TokenHelperService } from './core/token-helper.service';
import { LocalState, TokenRequestResult, DecodedIdentityToken } from './core/models';
import { TokensReadyEvent } from './auth.events';

function spyOnGet<T>(obj: T, property: keyof T) {
    Object.defineProperty(obj, property, { get: () => null });
    return spyOnProperty(obj, property, 'get');
}

describe('RefrshTokenClientService', () => {
    let refreshTokenClient: RefreshTokenClient;
    let refreshTokenValidationSpy: jasmine.SpyObj<RefreshTokenValidationService>;
    let authConfigSpy: jasmine.SpyObj<AuthConfigService>;
    let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;
    let tokenHelperSpy: jasmine.SpyObj<TokenHelperService>;
    let tokenUrlSpy: jasmine.SpyObj<TokenUrlService>;
    let tokenValidationSpy: jasmine.SpyObj<TokenValidationService>;
    let tokenEndpointSpy: jasmine.SpyObj<TokenEndpointClientService>;
    let eventsSpy: jasmine.SpyObj<EventsService>;
    let stateSpy: jasmine.Spy<InferableFunction>;

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
        refreshTokenValidationSpy = jasmine.createSpyObj('RefreshTokenValidationService', ['validateIdToken']);
        tokenHelperSpy = jasmine.createSpyObj('TokenHelperSpy', ['getPayloadFromToken']);
        authConfigSpy = jasmine.createSpyObj('AuthConfigService', ['configuration']);
        tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['storeTokens', 'currentState$']);
        tokenUrlSpy = jasmine.createSpyObj('TokenUrlService', ['createRefreshTokenRequestPayload']);
        tokenValidationSpy = jasmine.createSpyObj('TokenValidationService', ['validateAccessToken']);
        tokenEndpointSpy = jasmine.createSpyObj('TokenEndpointClientService', ['call']);
        eventsSpy = jasmine.createSpyObj('EventsService', ['dispatch']);

        TestBed.configureTestingModule({
            providers: [
                {
                    provide: RefreshTokenValidationService,
                    useValue: refreshTokenValidationSpy
                },
                {
                    provide: AuthConfigService,
                    useValue: refreshTokenValidationSpy
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
                {
                    provide: TokenHelperService,
                    useValue: tokenHelperSpy
                },
                RefreshTokenClient
            ],
        });

        const configSpy = spyOnGet(TestBed.get(AuthConfigService) as AuthConfigService, 'configuration');
        configSpy.and.returnValue(config);

        const baseUrlSpy = spyOnGet(TestBed.get(AuthConfigService) as AuthConfigService, 'baseUrl');
        baseUrlSpy.and.returnValue(baseUrl);

        stateSpy = spyOnGet(TestBed.get(TokenStorageService) as TokenStorageService, 'currentState$');

        refreshTokenClient = TestBed.get(RefreshTokenClient);
    });

    it('should create', () => {
        expect(refreshTokenClient).toBeTruthy();
    });

    describe('Request Token using Refresh Code', () => {
        it('should use token url to generate token endpoint payload', fakeAsync(() => {

            const localState: Partial<LocalState> = {
                refreshToken: 'refresh-token'
            };

            stateSpy.and.returnValue(of(localState));

            tokenEndpointSpy.call.and.returnValue(of());

            refreshTokenClient.requestTokenWithRefreshCode()
                .subscribe();
            flush();

            expect(tokenUrlSpy.createRefreshTokenRequestPayload).toHaveBeenCalledWith({
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                refreshToken: localState.refreshToken
            });
        }));

        it('should validate Identity Token using validation service', fakeAsync(() => {

            const localState: Partial<LocalState> = {
                refreshToken: 'refresh-token',
                originalIdentityToken: 'original-id-token'
            };

            stateSpy.and.returnValue(of(localState));

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

            const originalToken: DecodedIdentityToken = {} as any;

            tokenHelperSpy.getPayloadFromToken.and.returnValue(originalToken);

            tokenStorageSpy.storeTokens.and.returnValue(of());

            refreshTokenClient.requestTokenWithRefreshCode()
                .subscribe();
            flush();

            expect(tokenHelperSpy.getPayloadFromToken).toHaveBeenCalledWith(localState.originalIdentityToken);
            expect(refreshTokenValidationSpy.validateIdToken).toHaveBeenCalledWith(originalToken, tokenResponse.decodedIdToken);
        }));

        it('should store new tokens after validation', fakeAsync(() => {

            const localState: Partial<LocalState> = {
                refreshToken: 'refresh-token',
                originalIdentityToken: 'original-id-token'
            };

            stateSpy.and.returnValue(of(localState));

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

            const originalToken: DecodedIdentityToken = {} as any;

            tokenHelperSpy.getPayloadFromToken.and.returnValue(originalToken);

            tokenStorageSpy.storeTokens.and.returnValue(of(localState as any));

            refreshTokenClient.requestTokenWithRefreshCode()
                .subscribe();
            flush();

            expect(tokenStorageSpy.storeTokens).toHaveBeenCalledWith(tokenResponse);
            expect(eventsSpy.dispatch).toHaveBeenCalledWith(new TokensReadyEvent(tokenResponse));
        }));

    });


});
