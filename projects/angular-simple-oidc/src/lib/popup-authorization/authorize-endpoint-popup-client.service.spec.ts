import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { LocalState, TokenUrlService } from 'angular-simple-oidc/core';
import { of } from 'rxjs';
import { TokenStorageService } from '../token-storage.service';
import { EventsService } from 'angular-simple-oidc/events';
import { WINDOW_REF, AUTH_CONFIG_SERVICE } from '../providers';
import { AuthConfig } from '../config/models';
import { OidcCodeFlowClient } from '../oidc-code-flow-client.service';
import { ConfigService } from 'angular-simple-oidc/config';
import { AuthorizeEndpointPopupClientService } from './authorize-endpoint-popup-client.service';
import { POPUP_AUTHORIZATION_CONFIG_SERVICE } from './providers';
import { PopupAuthorizationConfig } from './models';
import { ChildWindowClosedError } from './errors';
import { spyOnGet } from '../../../test-utils';

describe('Authorize Endpoint Popup Client ', () => {
    let popupClient: AuthorizeEndpointPopupClientService;
    let windowSpy: CustomMockObject<Window>;
    let tokenStorageSpy: CustomMockObject<TokenStorageService>;
    let tokenUrlSpy: CustomMockObject<TokenUrlService>;
    let localStateSpy: jasmine.Spy<jasmine.Func>;
    let eventsSpy: CustomMockObject<EventsService>;
    let oidcCodeFlowClientSpy: CustomMockObject<OidcCodeFlowClient>;

    let configServiceSpy: CustomMockObject<ConfigService<AuthConfig>>;
    let authConfigSpy: jasmine.Spy<jasmine.Func>;

    let popupConfigServiceSpy: CustomMockObject<ConfigService<PopupAuthorizationConfig>>;
    let popupConfigSpy: jasmine.Spy<jasmine.Func>;

    let postToWindow: EventListener;
    const expectedOrigin = new URL('http://my-idp/identity').origin;

    const iframeUrl = 'http://base-url/iframe/path.html';
    let childWindowSpy: CustomMockObject<Window>;

    beforeEach(() => {
        windowSpy = {
            'addEventListener': jest.fn(),
            'removeEventListener': jest.fn(),
            'open': jest.fn()
        };
        tokenStorageSpy = {
            'storeAuthorizationCode': jest.fn()
        };
        tokenUrlSpy = {
            'createAuthorizationCodeRequestPayload': jest.fn()
        };
        eventsSpy = {
            'dispatch': jest.fn()
        };
        configServiceSpy = {
            'current$': jest.fn()
        };
        popupConfigServiceSpy = {
            'current$': jest.fn()
        };
        oidcCodeFlowClientSpy = {
            'codeFlowCallback': jest.fn(),
            'generateCodeFlowMetadata': jest.fn()
        };
        childWindowSpy = {
            'close': jest.fn()
        };
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: WINDOW_REF,
                    useValue: windowSpy
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
                {
                    provide: AUTH_CONFIG_SERVICE,
                    useValue: configServiceSpy
                },
                {
                    provide: POPUP_AUTHORIZATION_CONFIG_SERVICE,
                    useValue: popupConfigServiceSpy
                },
                {
                    provide: TokenUrlService,
                    useValue: tokenUrlSpy
                },
                {
                    provide: OidcCodeFlowClient,
                    useValue: oidcCodeFlowClientSpy
                },
                AuthorizeEndpointPopupClientService
            ],
        });

        localStateSpy = spyOnGet(TestBed.get(TokenStorageService) as TokenStorageService, 'currentState$');
        localStateSpy.mockReturnValue(of({
            identityToken: 'id-token',
            sessionState: 'session-state'
        } as Partial<LocalState>));

        authConfigSpy = spyOnGet(TestBed.get(AUTH_CONFIG_SERVICE) as ConfigService<AuthConfig>, 'current$');
        authConfigSpy.mockReturnValue(of({
            clientId: 'client-id',
            openIDProviderUrl: 'http://my-idp/identity',
            baseUrl: 'http://base-url/',
        } as Partial<AuthConfig>));

        popupConfigSpy = spyOnGet(
            TestBed.get(POPUP_AUTHORIZATION_CONFIG_SERVICE) as ConfigService<PopupAuthorizationConfig>,
            'current$');
        popupConfigSpy.mockReturnValue(of({
            childWindowPath: 'iframe/path.html'
        } as Partial<PopupAuthorizationConfig>));

        const docSpyObj = {
            'createElement': jest.fn()
        };
        const docSpy = spyOnGet(TestBed.get(WINDOW_REF) as Window, 'document');
        docSpy.mockReturnValue(docSpyObj);
        // tslint:disable-next-line: deprecation
        docSpyObj.createElement.mockReturnValue({
            'contentWindow': jest.fn()
        });

        windowSpy.addEventListener.mockImplementation((name: string, handler: EventListenerOrEventListenerObject) => {
            postToWindow = handler as EventListener;
        });
        windowSpy.open.mockReturnValue(childWindowSpy as any);

        spyOnGet(TestBed.get(WINDOW_REF), 'screen').mockReturnValue({
                width: 123,
                height: 123
            });

        tokenStorageSpy.storeAuthorizationCode.mockReturnValue(of({} as any));
        oidcCodeFlowClientSpy.codeFlowCallback.mockReturnValue(of({} as any));
        oidcCodeFlowClientSpy.generateCodeFlowMetadata.mockReturnValue(of({} as any));
        popupClient = TestBed.get(AuthorizeEndpointPopupClientService);
    });

    it('should create', () => {
        expect(popupClient).toBeTruthy();
    });

    it('Generates URL with display popup', fakeAsync(() => {

        popupClient.startCodeFlowInPopup()
            .subscribe();

        postToWindow(new MessageEvent('message', {
            data: iframeUrl,
            origin: expectedOrigin
        }));

        flush();

        expect(oidcCodeFlowClientSpy.generateCodeFlowMetadata)
            .toHaveBeenCalledWith({ redirectUri: iframeUrl, display: 'popup' });
    }));

    it('Obtains URL from window correctly', fakeAsync(() => {

        popupClient.startCodeFlowInPopup()
            .subscribe();

        const expectedUrl = `${iframeUrl}?code=auth-code`;
        postToWindow(new MessageEvent('message', {
            data: expectedUrl,
            origin: expectedOrigin
        }));

        flush();

        expect(oidcCodeFlowClientSpy.codeFlowCallback).toHaveBeenCalledWith(expectedUrl, iframeUrl, {} as any);
    }));

    it('Validates the callback', fakeAsync(() => {

        const state = 'state';
        const expectedUrl = `${iframeUrl}?code=auth-code`;
        const metadata = { state };
        oidcCodeFlowClientSpy.generateCodeFlowMetadata.mockReturnValue(of(metadata as any));

        popupClient.startCodeFlowInPopup()
            .subscribe();

        postToWindow(new MessageEvent('message', {
            data: expectedUrl,
            origin: expectedOrigin
        }));

        flush();

        expect(oidcCodeFlowClientSpy.codeFlowCallback).toHaveBeenCalledWith(expectedUrl, iframeUrl, metadata as any);
    }));

    it('Reacts when window is closed', fakeAsync(() => {

        const state = 'state';
        const expectedUrl = `${iframeUrl}?code=auth-code`;
        const metadata = { state };
        oidcCodeFlowClientSpy.generateCodeFlowMetadata.mockReturnValue(of(metadata as any));

        popupClient.startCodeFlowInPopup()
            .subscribe();

        tick(1000);
        (childWindowSpy as any).closed = true;
        expect(() => {

            tick(500);
            flush();
        }).toThrowError(ChildWindowClosedError);
    }));

});
