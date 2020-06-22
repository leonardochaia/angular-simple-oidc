import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import { DiscoveryDocument, LocalState, TokenUrlService } from 'angular-simple-oidc/core';
import { of } from 'rxjs';
import { EndSessionClientService } from './end-session-client.service';
import { WINDOW_REF } from './providers';
import { TokenStorageService } from './token-storage.service';
import { EventsService } from 'angular-simple-oidc/events';
import { spyOnGet } from '../../test-utils';

describe('EndSessionClientService', () => {
    let endSessionClient: EndSessionClientService;
    let windowSpy: jasmine.SpyObj<Window>;
    let discoveryDocClientSpy: jasmine.SpyObj<OidcDiscoveryDocClient>;
    let tokenUrlSpy: jasmine.SpyObj<TokenUrlService>;
    let discoveryDocSpy: jasmine.Spy<jasmine.Func>;
    let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;
    let localStateSpy: jasmine.Spy<jasmine.Func>;
    let eventsSpy: jasmine.SpyObj<EventsService>;

    beforeEach(() => {
        windowSpy = jasmine.createSpyObj('window', ['location']);
        discoveryDocClientSpy = jasmine.createSpyObj('OidcDiscoveryDocClient', ['current$']);
        tokenUrlSpy = jasmine.createSpyObj('TokenUrlService', ['createEndSessionUrl']);
        tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['removeAll']);
        eventsSpy = jasmine.createSpyObj('EventsService', ['dispatch']);

        TestBed.configureTestingModule({
            providers: [
                {
                    provide: WINDOW_REF,
                    useValue: windowSpy
                },
                {
                    provide: OidcDiscoveryDocClient,
                    useValue: discoveryDocClientSpy,
                },
                {
                    provide: TokenUrlService,
                    useValue: tokenUrlSpy
                },
                {
                    provide: TokenStorageService,
                    useValue: tokenStorageSpy
                },
                {
                    provide: EventsService,
                    useValue: eventsSpy
                },
                EndSessionClientService
            ],
        });

        discoveryDocSpy = spyOnGet(TestBed.get(OidcDiscoveryDocClient) as OidcDiscoveryDocClient, 'current$');
        discoveryDocSpy.and.returnValue(of({
            end_session_endpoint: 'http://end-session'
        } as Partial<DiscoveryDocument>));

        localStateSpy = spyOnGet(TestBed.get(TokenStorageService) as TokenStorageService, 'currentState$');
        localStateSpy.and.returnValue(of({
            identityToken: 'id-token'
        } as Partial<LocalState>));

        tokenStorageSpy.removeAll.and.returnValue(of({} as any));

        endSessionClient = TestBed.get(EndSessionClientService);
    });

    it('should create', () => {
        expect(endSessionClient).toBeTruthy();
    });

    describe('End Session', () => {
        it('uses token URL for creating end session URL', fakeAsync(() => {
            const postLogoutUri = 'post-logout-uri';

            tokenUrlSpy.createEndSessionUrl.and.returnValue({
                state: 'state',
                url: 'http://end-it'
            });

            endSessionClient.logoutWithRedirect(postLogoutUri)
                .subscribe();
            flush();

            expect(tokenUrlSpy.createEndSessionUrl).toHaveBeenCalled();
        }));

        it('clears storage before redirecting', fakeAsync(() => {
            const postLogoutUri = 'post-logout-uri';

            tokenUrlSpy.createEndSessionUrl.and.returnValue({
                state: 'state',
                url: 'http://end-it'
            });

            endSessionClient.logoutWithRedirect(postLogoutUri)
                .subscribe();
            flush();

            expect(tokenStorageSpy.removeAll).toHaveBeenCalled();
        }));

        it('redirects to the provided endpoint', fakeAsync(() => {
            const postLogoutUri = 'post-logout-uri';

            const expected = 'http://end-it';
            tokenUrlSpy.createEndSessionUrl.and.returnValue({
                state: 'state',
                url: expected
            });

            endSessionClient.logoutWithRedirect(postLogoutUri)
                .subscribe();
            flush();

            expect(windowSpy.location.href).toEqual(expected);
        }));

    });

});
