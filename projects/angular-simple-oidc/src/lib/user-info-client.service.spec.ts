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
import { spyOnGet } from '../../test-utils';

describe('UserInfoClientService', () => {
    let userInfoClient: UserInfoClientService;
    let discoveryDocClientSpy: CustomMockObject<OidcDiscoveryDocClient>;
    let tokenStorageSpy: CustomMockObject<TokenStorageService>;
    let discoveryDocSpy: jasmine.Spy<jasmine.Func>;
    let localStateSpy: jasmine.Spy<jasmine.Func>;
    let eventsSpy: CustomMockObject<EventsService>;
    let httpSpy: CustomMockObject<HttpClient>;

    beforeEach(() => {
        discoveryDocClientSpy = {
            'current$': jest.fn()
        };
        tokenStorageSpy = {
            'removeAll': jest.fn()
        };
        eventsSpy = {
            'dispatch': jest.fn()
        };
        httpSpy = {
            'get': jest.fn()
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
        discoveryDocSpy.mockReturnValue(of({
            userinfo_endpoint: 'http://user-info'
        } as Partial<DiscoveryDocument>));

        localStateSpy = spyOnGet(TestBed.get(TokenStorageService) as TokenStorageService, 'currentState$');
        localStateSpy.mockReturnValue(of({
            accessToken: 'access-token'
        } as Partial<LocalState>));

        userInfoClient = TestBed.get(UserInfoClientService);
    });

    it('should create', () => {
        expect(userInfoClient).toBeTruthy();
    });

    it('should fail if no user_info_endpoint on discovery document', fakeAsync(() => {
        discoveryDocSpy.mockReturnValue(of({
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
