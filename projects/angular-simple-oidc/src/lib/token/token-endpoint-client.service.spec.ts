import { TestBed, fakeAsync, flush, flushMicrotasks } from '@angular/core/testing';
import { TokenEndpointClientService } from './token-endpoint-client.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { OidcDiscoveryDocClient } from '../discovery-document/oidc-discovery-doc-client.service';
import { TokenHelperService } from './token-helper.service';
import { TokenValidationService } from './token-validation.service';
import { DiscoveryDocument } from '../discovery-document/models';
import { of, throwError } from 'rxjs';
import { TokenRequestResult, DecodedIdentityToken } from './models';
import { ValidationResult } from './validation-result';

function spyOnGet<T>(obj: T, property: keyof T) {
    Object.defineProperty(obj, property, { get: () => null });
    return spyOnProperty(obj, property, 'get');
}

/**
 * Inspired on https://github.com/damienbod/angular-auth-oidc-client
 */
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
        expect(TokenEndpointClientService).toBeTruthy();
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

        it('throws when an error is returned',
            fakeAsync(() => {
                const tokenEndpoint = 'http://token-endpoint';
                const payload = 'payload';
                const error = 'some-error';

                discoveryDocSpy.and.returnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                httpSpy.post.and.returnValue(of({
                    error: error,
                }));

                expect(() => {
                    tokenEndpointClientService.call(payload)
                        .subscribe(() => { });

                    flush();
                }).toThrow({
                    errorCode: error,
                    message: error,
                    success: false
                } as ValidationResult);
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
                    .and.returnValue(ValidationResult.noErrors);

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
                const error = ValidationResult.idTokenInvalidNoDots(idToken, 0);

                discoveryDocSpy.and.returnValue(of({
                    token_endpoint: tokenEndpoint
                } as Partial<DiscoveryDocument>));

                httpSpy.post.and.returnValue(of({
                    id_token: idToken
                }));

                tokenValidationSpy.validateIdTokenFormat
                    .and.returnValue(error);
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
