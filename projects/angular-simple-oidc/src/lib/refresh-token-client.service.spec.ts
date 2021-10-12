import { TestBed, flush, fakeAsync } from '@angular/core/testing';
import { TokenEndpointClientService } from './token-endpoint-client.service';
import {
    TokenValidationService,
    TokenUrlService,
    RefreshTokenValidationService,
    TokenHelperService,
    LocalState,
    TokenRequestResult,
    DecodedIdentityToken
} from 'angular-simple-oidc/core';
import { of } from 'rxjs';
import { TokenStorageService } from './token-storage.service';
import { EventsService } from 'angular-simple-oidc/events';
import { AuthConfig } from './config/models';
import { RefreshTokenClient } from './refresh-token-client.service';
import { TokensReadyEvent } from './auth.events';
import { ConfigService } from 'angular-simple-oidc/config';
import { AUTH_CONFIG_SERVICE } from './providers';
import { spyOnGet } from '../../test-utils';


describe('RefrshTokenClientService', () => {
    let refreshTokenClient: RefreshTokenClient;
    let refreshTokenValidationSpy: CustomMockObject<RefreshTokenValidationService>;
    let authConfigSpy: CustomMockObject<ConfigService<AuthConfig>>;
    let tokenStorageSpy: CustomMockObject<TokenStorageService>;
    let tokenHelperSpy: CustomMockObject<TokenHelperService>;
    let tokenUrlSpy: CustomMockObject<TokenUrlService>;
    let tokenValidationSpy: CustomMockObject<TokenValidationService>;
    let tokenEndpointSpy: CustomMockObject<TokenEndpointClientService>;
    let eventsSpy: CustomMockObject<EventsService>;
    let stateSpy: jasmine.Spy<jasmine.Func>;

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
        refreshTokenValidationSpy = {
            'validateIdToken': jest.fn()
        };
        tokenHelperSpy = {
            'getPayloadFromToken': jest.fn()
        };
        authConfigSpy = {
            'configuration': jest.fn()
        };
        tokenStorageSpy = {
            'storeTokens': jest.fn(),
            'currentState$': jest.fn()
        };
        tokenUrlSpy = {
            'createRefreshTokenRequestPayload': jest.fn()
        };
        tokenValidationSpy = {
            'validateAccessToken': jest.fn()
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
                    provide: RefreshTokenValidationService,
                    useValue: refreshTokenValidationSpy
                },
                {
                    provide: AUTH_CONFIG_SERVICE,
                    useValue: authConfigSpy
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

        const configSpy = spyOnGet(TestBed.get(AUTH_CONFIG_SERVICE) as ConfigService<AuthConfig>, 'current$');
        configSpy.mockReturnValue(of(config));

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

            stateSpy.mockReturnValue(of(localState));

            tokenEndpointSpy.call.mockReturnValue(of());

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

            stateSpy.mockReturnValue(of(localState));

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

            const originalToken: DecodedIdentityToken = {} as any;

            tokenHelperSpy.getPayloadFromToken.mockReturnValue(originalToken);

            tokenStorageSpy.storeTokens.mockReturnValue(of());

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

            stateSpy.mockReturnValue(of(localState));

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

            const originalToken: DecodedIdentityToken = {} as any;

            tokenHelperSpy.getPayloadFromToken.mockReturnValue(originalToken);

            tokenStorageSpy.storeTokens.mockReturnValue(of(localState as any));

            refreshTokenClient.requestTokenWithRefreshCode()
                .subscribe();
            flush();

            expect(tokenStorageSpy.storeTokens).toHaveBeenCalledWith(tokenResponse);
            expect(eventsSpy.dispatch).toHaveBeenCalledWith(new TokensReadyEvent(tokenResponse));
        }));

    });


});
