import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { OidcDiscoveryDocClient } from './discovery-document/oidc-discovery-doc-client.service';
import { DiscoveryDocument, LocalState, TokenUrlService } from 'angular-simple-oidc/core';
import { Observable, of } from 'rxjs';
import { EndSessionClientService } from './end-session-client.service';
import { WINDOW_REF } from './providers';
import { TokenStorageService } from './token-storage.service';
import { EventsService } from 'angular-simple-oidc/events';
import { CustomMockObject } from 'setup-jest';
import { spyOnGet } from '../../test-utils';

describe('EndSessionClientService', () => {
    let endSessionClient: EndSessionClientService;
    let windowSpy: Partial<Window>;
    let discoveryDocClientSpy: CustomMockObject<OidcDiscoveryDocClient>;
    let tokenUrlSpy: CustomMockObject<TokenUrlService>;
    let discoveryDocSpy: jest.SpyInstance<Observable<Partial<DiscoveryDocument>>>;
    let tokenStorageSpy: CustomMockObject<TokenStorageService>;
    let localStateSpy: jest.SpyInstance;
    let eventsSpy: CustomMockObject<EventsService>;

    beforeEach(() => {
        windowSpy = {
            'location': jest.fn() as any
        };
        discoveryDocClientSpy = {
            'current$': jest.fn()
        };
        tokenUrlSpy = {
            'createEndSessionUrl': jest.fn()
        };
        tokenStorageSpy = {
            'removeAll': jest.fn()
        };
        eventsSpy = {
            'dispatch': jest.fn()
        };

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

        discoveryDocSpy = spyOnGet(TestBed.inject(OidcDiscoveryDocClient), 'current$');
        discoveryDocSpy.mockReturnValue(of({
            end_session_endpoint: 'http://end-session'
        } as Partial<DiscoveryDocument>));

        localStateSpy = spyOnGet(TestBed.inject(TokenStorageService), 'currentState$');
        localStateSpy.mockReturnValue(of({
            identityToken: 'id-token'
        } as Partial<LocalState>));

        tokenStorageSpy.removeAll.mockReturnValue(of({} as any));

        endSessionClient = TestBed.inject(EndSessionClientService);
    });

    it('should create', () => {
        expect(endSessionClient).toBeTruthy();
    });

    describe('End Session', () => {
        it('uses token URL for creating end session URL', fakeAsync(() => {
            const postLogoutUri = 'post-logout-uri';

            tokenUrlSpy.createEndSessionUrl.mockReturnValue({
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

            tokenUrlSpy.createEndSessionUrl.mockReturnValue({
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
            tokenUrlSpy.createEndSessionUrl.mockReturnValue({
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
