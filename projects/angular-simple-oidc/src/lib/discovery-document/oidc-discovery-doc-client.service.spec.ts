import { fakeAsync, flush } from '@angular/core/testing';
import { OidcDiscoveryDocClient } from './oidc-discovery-doc-client.service';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { AuthConfig } from '../config/models';
import { DiscoveryDocument, JWTKeys } from 'angular-simple-oidc/core';
import { of, throwError } from 'rxjs';
import { ObtainDiscoveryDocumentError, ObtainJWTKeysError } from './errors';
import { EventsService } from 'angular-simple-oidc/events';
import { ConfigService } from 'angular-simple-oidc/config';
import { urlJoin } from '../utils/url-join';
import { spyOnGet } from '../../../test-utils';


describe('OidcDiscoveryDocClient', () => {
    let httpSpy: CustomMockObject<HttpClient>;
    let configSpy: CustomMockObject<ConfigService<AuthConfig>>;
    let authConfigSpy: jasmine.Spy<jasmine.Func>;
    let eventsSpy: CustomMockObject<EventsService>;

    const config: Partial<AuthConfig> = {
        openIDProviderUrl: 'http://example.com',
        discoveryDocumentUrl: '/.well-known/openid-configuration'
    };

    function createDiscoveryClient(doc: DiscoveryDocument = {} as any) {
        httpSpy.get.mockReturnValue(of(doc));

        // we need to re-create it since observables gets created on constructor
        return new OidcDiscoveryDocClient(
            configSpy,
            httpSpy,
            eventsSpy
        );
    }

    beforeEach(() => {
        httpSpy = {
            'post': jest.fn(),
            'get': jest.fn()
        };
        configSpy = {
            'configuration': jest.fn()
        };
        eventsSpy = {
            'dispatch': jest.fn(),
            'dispatchError': jest.fn()
        };

        authConfigSpy = spyOnGet(configSpy, 'current$');

        authConfigSpy.mockReturnValue(of(config));
    });

    it('should create', () => {
        expect(createDiscoveryClient()).toBeTruthy();
    });

    describe('requestDiscoveryDocument', () => {

        it('returns discovery doc when no errors', fakeAsync(() => {
            const expected = {} as DiscoveryDocument;
            const discoveryClient = createDiscoveryClient(expected);

            let output: DiscoveryDocument;
            discoveryClient.current$
                .subscribe(r => output = r);

            flush();

            expect(output).toBe(expected);
        }));

        it('wraps errors with proper class', fakeAsync(() => {
            const discoveryClient = createDiscoveryClient();

            httpSpy.get.mockReturnValue(throwError(new HttpErrorResponse({
                headers: new HttpHeaders(),
                error: 'whatever',
                status: 404,
                statusText: 'Not found',
                url: urlJoin(config.openIDProviderUrl, config.discoveryDocumentUrl)
            })));

            expect(() => {
                discoveryClient.current$
                    .subscribe();

                flush();
            }).toThrowError(ObtainDiscoveryDocumentError);
        }));
    });

    describe('requestJWTKeys', () => {

        it('returns JWT Keys when no errors', fakeAsync(() => {

            const doc = {
                jwks_uri: 'http://example.com/jwtkuri'
            } as DiscoveryDocument;

            const discoveryClient = createDiscoveryClient(doc);

            const expected = {} as JWTKeys;
            httpSpy.get.mockReturnValue(of(expected));

            let output: JWTKeys;
            discoveryClient.jwtKeys$
                .subscribe(r => output = r);

            flush();

            expect(output).toBe(expected);
        }));

        it('wraps errors with proper class', fakeAsync(() => {

            const doc = {
                jwks_uri: 'http://example.com/jwtkuri'
            } as DiscoveryDocument;
            const discoveryClient = createDiscoveryClient(doc);

            httpSpy.get.mockReturnValue(throwError(new HttpErrorResponse({
                headers: new HttpHeaders(),
                error: 'whatever',
                status: 404,
                statusText: 'Not found',
                url: doc.jwks_uri
            })));

            expect(() => {
                discoveryClient.jwtKeys$
                    .subscribe();

                flush();
            }).toThrowError(ObtainJWTKeysError);
        }));
    });

    describe('memory caches', () => {

        it('fetches discovery doc and then returns same instance without fetching again', fakeAsync(() => {

            const doc = {
            } as DiscoveryDocument;
            const discoveryClient = createDiscoveryClient(doc);

            let output1: DiscoveryDocument;
            discoveryClient.current$
                .subscribe(o => output1 = o);

            flush();

            let output2: DiscoveryDocument;
            discoveryClient.current$
                .subscribe(o => output2 = o);
            flush();

            expect(output2).toBe(output1);
            expect(output1).toBe(doc as any);

            expect(httpSpy.get).toHaveBeenCalledTimes(1);
        }));

        it('fetches JWT Keys and then returns same instance without fetching again', fakeAsync(() => {

            const discoveryClient = createDiscoveryClient();
            const expected = {} as JWTKeys;
            httpSpy.get.mockReturnValue(of(expected));

            let output1: JWTKeys;
            discoveryClient.jwtKeys$
                .subscribe(o => output1 = o);

            flush();

            let output2: JWTKeys;
            discoveryClient.jwtKeys$
                .subscribe(o => output2 = o);
            flush();

            discoveryClient.jwtKeys$.subscribe();
            discoveryClient.jwtKeys$.subscribe();
            discoveryClient.jwtKeys$.subscribe();
            flush();

            expect(output2).toBe(output1);
            expect(output1).toBe(expected);

            // 1 for disco 1 for jwtks
            expect(httpSpy.get).toHaveBeenCalledTimes(2);
        }));

    });

});
