import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import { DiscoveryDocument, LocalState, TokenUrlService } from 'angular-simple-oidc/core';
import { of } from 'rxjs';
import { WINDOW_REF } from './providers';
import { TokenStorageService } from './token-storage.service';
import { EventsService } from 'angular-simple-oidc/events';
import { UserInfoClientService } from './user-info-client.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UserInfoNotSupportedError } from './errors';

function spyOnGet<T>(obj: T, property: keyof T) {
    Object.defineProperty(obj, property, { get: () => null });
    return spyOnProperty(obj, property, 'get');
}

describe('UserInfoClientService', () => {
    let userInfoClient: UserInfoClientService;
    let discoveryDocClientSpy: jasmine.SpyObj<OidcDiscoveryDocClient>;
    let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;
    let discoveryDocSpy: jasmine.Spy<InferableFunction>;
    let localStateSpy: jasmine.Spy<InferableFunction>;
    let eventsSpy: jasmine.SpyObj<EventsService>;
    let httpSpy: jasmine.SpyObj<HttpClient>;

    beforeEach(() => {
        discoveryDocClientSpy = jasmine.createSpyObj('OidcDiscoveryDocClient', ['current$']);
        tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['removeAll']);
        eventsSpy = jasmine.createSpyObj('EventsService', ['dispatch']);
        httpSpy = jasmine.createSpyObj('HttpClient', ['get']);

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
                    provide: TokenStorageService,
                    useValue: tokenStorageSpy
                },
                {
                    provide: EventsService,
                    useValue: eventsSpy
                },
                UserInfoClientService
            ],
        });

        discoveryDocSpy = spyOnGet(TestBed.get(OidcDiscoveryDocClient) as OidcDiscoveryDocClient, 'current$');
        discoveryDocSpy.and.returnValue(of({
            userinfo_endpoint: 'http://user-info'
        } as Partial<DiscoveryDocument>));

        localStateSpy = spyOnGet(TestBed.get(TokenStorageService) as TokenStorageService, 'currentState$');
        localStateSpy.and.returnValue(of({
            accessToken: 'access-token'
        } as Partial<LocalState>));

        userInfoClient = TestBed.get(UserInfoClientService);
    });

    it('should create', () => {
        expect(userInfoClient).toBeTruthy();
    });

    it('should fail if no user_info_endpoint on discovery document', fakeAsync(() => {
        discoveryDocSpy.and.returnValue(of({
            user_info_endpoint: null
        }));

        expect(() => {
            userInfoClient.getUserInfo()
                .subscribe();
            flush();
        })
            .toThrowError(UserInfoNotSupportedError);
    }));
});
