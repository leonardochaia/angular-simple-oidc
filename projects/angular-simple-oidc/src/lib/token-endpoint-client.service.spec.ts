import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { TokenEndpointClientService } from './token-endpoint-client.service';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import { TokenHelperService } from './core/token-helper.service';
import { TokenValidationService } from './core/token-validation.service';
import { DiscoveryDocument } from './core/models';
import { of, throwError } from 'rxjs';
import { TokenRequestResult, DecodedIdentityToken } from './core/models';
import { TokenEndpointError, TokenEndpointUnexpectedError } from './errors';
import { IdentityTokenMalformedError } from './core/token-validation-errors';
import { SimpleOidcError } from './core/errors';

function spyOnGet<T>(obj: T, property: keyof T) {
    Object.defineProperty(obj, property, { get: () => null });
    return spyOnProperty(obj, property, 'get');
}

describe('TokenEndpointClientService', () => {
    let tokenEndpointClientService: TokenEndpointClientService;
    let httpSpy: jasmine.SpyObj<HttpClient>;
    let discoveryDocClientSpy: jasmine.SpyObj<OidcDiscoveryDocClient>;
    let discoveryDocSpy: jasmine.Spy<InferableFunction>;
    let tokenHelperSpy: jasmine.SpyObj<TokenHelperService>;
    let tokenValidationSpy: jasmine.SpyObj<TokenValidationService>;

    beforeEach(() => {
        httpSpy = jasmine.createSpyObj('HttpClient', ['post']);
        discoveryDocClientSpy = jasmine.createSpyObj('OidcDiscoveryDocClient', ['current$']);
        tokenHelperSpy = jasmine.createSpyObj('TokenHelperService', ['getExpirationFromExpiresIn', 'getPayloadFromToken']);
        tokenValidationSpy = jasmine.createSpyObj('TokenValidationService', ['validateIdTokenFormat']);

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

                discoveryDocSpy.and.returnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                httpSpy.post.and.returnValue(throwError('something'));

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

                discoveryDocSpy.and.returnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                httpSpy.post.and.returnValue(throwError({
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

                discoveryDocSpy.and.returnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                httpSpy.post.and.returnValue(throwError({
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

                discoveryDocSpy.and.returnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                const expected = new SimpleOidcError('bad', 'b', {});
                httpSpy.post.and.returnValue(throwError(expected));

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

                discoveryDocSpy.and.returnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                tokenHelperSpy.getExpirationFromExpiresIn
                    .and.returnValue(expiresAt);

                httpSpy.post.and.returnValue(of({
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

                discoveryDocSpy.and.returnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                httpSpy.post.and.returnValue(of({
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

                discoveryDocSpy.and.returnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                httpSpy.post.and.returnValue(of({
                    id_token: idToken
                }));

                tokenValidationSpy.validateIdTokenFormat
                    .and.returnValue();

                tokenHelperSpy.getPayloadFromToken
                    .and.returnValue(decodedIdToken);

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

                discoveryDocSpy.and.returnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                httpSpy.post.and.returnValue(of({
                    id_token: idToken
                }));

                tokenValidationSpy.validateIdTokenFormat
                    .and.callFake(() => {
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
