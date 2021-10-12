import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { TokenEndpointClientService } from './token-endpoint-client.service';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import {
    TokenHelperService,
    TokenValidationService,
    DiscoveryDocument,
    TokenRequestResult,
    DecodedIdentityToken,
    IdentityTokenMalformedError,
    SimpleOidcError
} from 'angular-simple-oidc/core';
import { of, throwError } from 'rxjs';
import { TokenEndpointError, TokenEndpointUnexpectedError } from './errors';
import { spyOnGet } from '../../test-utils';


describe('TokenEndpointClientService', () => {
    let tokenEndpointClientService: TokenEndpointClientService;
    let httpSpy: CustomMockObject<HttpClient>;
    let discoveryDocClientSpy: CustomMockObject<OidcDiscoveryDocClient>;
    let discoveryDocSpy: jasmine.Spy<jasmine.Func>;
    let tokenHelperSpy: CustomMockObject<TokenHelperService>;
    let tokenValidationSpy: CustomMockObject<TokenValidationService>;

    beforeEach(() => {
        httpSpy = {
            'post': jest.fn()
        };
        discoveryDocClientSpy = {
            'current$': jest.fn()
        };
        tokenHelperSpy = {
            'getExpirationFromExpiresIn': jest.fn(),
            'getPayloadFromToken': jest.fn()
        };
        tokenValidationSpy = {
            'validateIdTokenFormat': jest.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                {
                    provide: HttpClient,
                    useValue: httpSpy
                },
                {
                    provide: OidcDiscoveryDocClient,
                    useValue: discoveryDocClientSpy,
                },
                {
                    provide: TokenValidationService,
                    useValue: tokenValidationSpy,
                },
                {
                    provide: TokenHelperService,
                    useValue: tokenHelperSpy
                },
                TokenEndpointClientService
            ],
        });

        discoveryDocSpy = spyOnGet(TestBed.get(OidcDiscoveryDocClient) as OidcDiscoveryDocClient, 'current$');
        tokenEndpointClientService = TestBed.get(TokenEndpointClientService);
    });

    it('should create', () => {
        expect(tokenEndpointClientService).toBeTruthy();
    });

    describe('call', () => {
        it('should use angular\'s HttpClient to post the token_endpoint URL from discovery doc',
            fakeAsync(() => {
                const tokenEndpoint = 'http://token-endpoint';
                const payload = 'payload';
                const headers = new HttpHeaders()
                    .set('Content-Type', 'application/x-www-form-urlencoded');

                discoveryDocSpy.mockReturnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                httpSpy.post.mockReturnValue(throwError('something'));

                tokenEndpointClientService.call(payload)
                    .subscribe(() => { }, () => { });

                flush();

                // validate 2 out of 3 params
                expect(httpSpy.post).toHaveBeenCalledWith(tokenEndpoint, payload, { headers });
            })
        );

        it('throws wrapped error when a known error is returned',
            fakeAsync(() => {
                const tokenEndpoint = 'http://token-endpoint';
                const payload = 'payload';
                const error = 'some-error';

                discoveryDocSpy.mockReturnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                httpSpy.post.mockReturnValue(throwError({
                    error: { error },
                    status: 400
                } as HttpErrorResponse));

                expect(() => {
                    tokenEndpointClientService.call(payload)
                        .subscribe();

                    flush();
                }).toThrow(new TokenEndpointError(error, null));
            })
        );

        it('throws wrapped error when an unknown error is returned',
            fakeAsync(() => {
                const tokenEndpoint = 'http://token-endpoint';
                const payload = 'payload';

                discoveryDocSpy.mockReturnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                httpSpy.post.mockReturnValue(throwError({
                    status: 500
                } as HttpErrorResponse));

                expect(() => {
                    tokenEndpointClientService.call(payload)
                        .subscribe();

                    flush();
                }).toThrow(new TokenEndpointUnexpectedError(null));
            })
        );

        it('doesn\' re-throw SimpleOidcError',
            fakeAsync(() => {
                const tokenEndpoint = 'http://token-endpoint';
                const payload = 'payload';

                discoveryDocSpy.mockReturnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                const expected = new SimpleOidcError('bad', 'b', {});
                httpSpy.post.mockReturnValue(throwError(expected));

                expect(() => {
                    tokenEndpointClientService.call(payload)
                        .subscribe();

                    flush();
                }).toThrow(expected);
            })
        );

        it('uses tokenHelper for calculating expiration date when expires_in is present',
            fakeAsync(() => {
                const tokenEndpoint = 'http://token-endpoint';
                const payload = 'payload';
                const expiresIn = 123;
                const expiresAt = new Date(0);

                discoveryDocSpy.mockReturnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                tokenHelperSpy.getExpirationFromExpiresIn.mockReturnValue(expiresAt);

                httpSpy.post.mockReturnValue(of({
                    expires_in: expiresIn,
                }));

                let result: TokenRequestResult;
                tokenEndpointClientService.call(payload)
                    .subscribe(r => result = r);

                flush();

                expect(tokenHelperSpy.getExpirationFromExpiresIn)
                    .toHaveBeenCalledWith(expiresIn);

                expect(result.accessTokenExpiresAt).toBe(expiresAt.getTime());
                expect(result.accessTokenExpiresIn).toBe(expiresIn);
            })
        );

        it('expires at is not calculated if expires_in is not present',
            fakeAsync(() => {
                const tokenEndpoint = 'http://token-endpoint';
                const payload = 'payload';
                const expiresIn = null;

                discoveryDocSpy.mockReturnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                httpSpy.post.mockReturnValue(of({
                    expires_in: expiresIn,
                }));

                let result: TokenRequestResult;
                tokenEndpointClientService.call(payload)
                    .subscribe(r => result = r);

                flush();

                expect(tokenHelperSpy.getExpirationFromExpiresIn)
                    .not.toHaveBeenCalled();

                expect(result.accessTokenExpiresAt).toBeNull();
                expect(result.accessTokenExpiresIn).toBeNull();
            })
        );

        it('validates id_token format and decodes it',
            fakeAsync(() => {
                const tokenEndpoint = 'http://token-endpoint';
                const payload = 'payload';
                const idToken = 'idToken';
                const decodedIdToken: DecodedIdentityToken = {} as any;

                discoveryDocSpy.mockReturnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                httpSpy.post.mockReturnValue(of({
                    id_token: idToken
                }));

                tokenValidationSpy.validateIdTokenFormat.mockReturnValue();

                tokenHelperSpy.getPayloadFromToken.mockReturnValue(decodedIdToken);

                let result: TokenRequestResult;
                tokenEndpointClientService.call(payload)
                    .subscribe(r => result = r);

                flush();

                expect(result.idToken).toBe(idToken);
                expect(result.decodedIdToken).toBe(decodedIdToken);
            })
        );

        it('throws if id_token format validation fails',
            fakeAsync(() => {
                const tokenEndpoint = 'http://token-endpoint';
                const payload = 'payload';
                const idToken = 'idToken';
                const error = new IdentityTokenMalformedError(null);

                discoveryDocSpy.mockReturnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                httpSpy.post.mockReturnValue(of({
                    id_token: idToken
                }));

                tokenValidationSpy.validateIdTokenFormat.mockImplementation(() => {
                        throw error;
                    });
                expect(() => {
                    tokenEndpointClientService.call(payload)
                        .subscribe();
                    flush();
                }).toThrow(error);

                expect(tokenHelperSpy.getPayloadFromToken).not.toHaveBeenCalled();
            })
        );

    });

});
