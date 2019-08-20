import { fakeAsync, flush } from '@angular/core/testing';
import { OidcDiscoveryDocClient } from './oidc-discovery-doc-client.service';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { AuthConfigService } from '../config/auth-config.service';
import { AuthConfig } from '../config/models';
import { DiscoveryDocument, JWTKeys } from 'angular-simple-oidc/core';
import { of, throwError } from 'rxjs';
import { ObtainDiscoveryDocumentError, ObtainJWTKeysError } from './errors';
import { EventsService } from '../events/events.service';


function spyOnGet<T>(obj: T, property: keyof T) {
    Object.defineProperty(obj, property, { get: () => null });
    return spyOnProperty(obj, property, 'get');
}

describe('OidcDiscoveryDocClient', () => {
    let httpSpy: jasmine.SpyObj<HttpClient>;
    let configSpy: jasmine.SpyObj<AuthConfigService>;
    let authConfigSpy: jasmine.Spy<InferableFunction>;
    let eventsSpy: jasmine.SpyObj<EventsService>;

    function createDiscoveryClient(doc: DiscoveryDocument = {} as any) {
        httpSpy.get.and.returnValue(of(doc));

        // we need to re-create it since observables gets created on constructor
        return new OidcDiscoveryDocClient(
            configSpy,
            httpSpy,
            eventsSpy
        );
    }

    beforeEach(() => {
        httpSpy = jasmine.createSpyObj('HttpClient', ['post', 'get']);
        configSpy = jasmine.createSpyObj('AuthConfigService', ['configuration']);
        eventsSpy = jasmine.createSpyObj('EventsSpy', ['dispatch', 'dispatchError']);

        authConfigSpy = spyOnGet(configSpy, 'configuration');

        authConfigSpy.and.returnValue({
            openIDProviderUrl: 'http://example.com',
            discoveryDocumentUrl: '/.well-known/openid-configuration'
        } as AuthConfig);
    });

    it('should create', () => {
        expect(createDiscoveryClient()).toBeTruthy();
    });

    describe('requestDiscoveryDocument', () => {

        it('returns discovery doc when no errors', fakeAsync(() => {
            const expected = {} as DiscoveryDocument;
            const discoveryClient = createDiscoveryClient(expected);

            let output: DiscoveryDocument;
            discoveryClient.requestDiscoveryDocument()
                .subscribe(r => output = r);

            flush();

            expect(output).toBe(expected);
        }));

        it('wraps errors with proper class', fakeAsync(() => {
            const discoveryClient = createDiscoveryClient();

            httpSpy.get.and.returnValue(throwError(new HttpErrorResponse({
                headers: new HttpHeaders(),
                error: 'whatever',
                status: 404,
                statusText: 'Not found',
                url: discoveryClient.discoveryDocumentAbsoluteEndpoint
            })));

            expect(() => {
                discoveryClient.requestDiscoveryDocument()
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
            httpSpy.get.and.returnValue(of(expected));

            let output: JWTKeys;
            discoveryClient.requestJWTKeys(doc)
                .subscribe(r => output = r);

            flush();

            expect(output).toBe(expected);
        }));

        it('wraps errors with proper class', fakeAsync(() => {

            const doc = {
                jwks_uri: 'http://example.com/jwtkuri'
            } as DiscoveryDocument;
            const discoveryClient = createDiscoveryClient(doc);

            httpSpy.get.and.returnValue(throwError(new HttpErrorResponse({
                headers: new HttpHeaders(),
                error: 'whatever',
                status: 404,
                statusText: 'Not found',
                url: doc.jwks_uri
            })));

            expect(() => {
                discoveryClient.requestJWTKeys(doc)
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
            httpSpy.get.and.returnValue(of(expected));

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
