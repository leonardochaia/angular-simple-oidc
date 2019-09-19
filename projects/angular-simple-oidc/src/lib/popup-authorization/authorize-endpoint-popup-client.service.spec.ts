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

function spyOnGet<T>(obj: T, property: keyof T) {
    Object.defineProperty(obj, property, { get: () => null });
    return spyOnProperty(obj, property, 'get');
}

describe('Authorize Endpoint Popup Client ', () => {
    let popupClient: AuthorizeEndpointPopupClientService;
    let windowSpy: jasmine.SpyObj<Window>;
    let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;
    let tokenUrlSpy: jasmine.SpyObj<TokenUrlService>;
    let localStateSpy: jasmine.Spy<InferableFunction>;
    let eventsSpy: jasmine.SpyObj<EventsService>;
    let oidcCodeFlowClientSpy: jasmine.SpyObj<OidcCodeFlowClient>;

    let configServiceSpy: jasmine.SpyObj<ConfigService<AuthConfig>>;
    let authConfigSpy: jasmine.Spy<InferableFunction>;

    let popupConfigServiceSpy: jasmine.SpyObj<ConfigService<PopupAuthorizationConfig>>;
    let popupConfigSpy: jasmine.Spy<InferableFunction>;

    let postToWindow: EventListener;
    const expectedOrigin = new URL('http://my-idp/identity').origin;

    const iframeUrl = 'http://base-url/iframe/path.html';
    let childWindowSpy: jasmine.SpyObj<Window>;

    beforeEach(() => {
        windowSpy = jasmine.createSpyObj('window', ['addEventListener', 'removeEventListener', 'open']);
        tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['storeAuthorizationCode']);
        tokenUrlSpy = jasmine.createSpyObj('TokenUrlService', ['createAuthorizationCodeRequestPayload']);
        eventsSpy = jasmine.createSpyObj('EventsService', ['dispatch']);
        configServiceSpy = jasmine.createSpyObj('AuthConfigService', ['current$']);
        popupConfigServiceSpy = jasmine.createSpyObj('SessionConfigService', ['current$']);
        oidcCodeFlowClientSpy = jasmine.createSpyObj('OidcCodeFlowClient', ['codeFlowCallback', 'generateCodeFlowMetadata']);
        childWindowSpy = jasmine.createSpyObj('ChildwindowSpy', ['close']);
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
        localStateSpy.and.returnValue(of({
            identityToken: 'id-token',
            sessionState: 'session-state'
        } as Partial<LocalState>));

        authConfigSpy = spyOnGet(TestBed.get(AUTH_CONFIG_SERVICE) as ConfigService<AuthConfig>, 'current$');
        authConfigSpy.and.returnValue(of({
            clientId: 'client-id',
            openIDProviderUrl: 'http://my-idp/identity',
            baseUrl: 'http://base-url/',
        } as Partial<AuthConfig>));

        popupConfigSpy = spyOnGet(
            TestBed.get(POPUP_AUTHORIZATION_CONFIG_SERVICE) as ConfigService<PopupAuthorizationConfig>,
            'current$');
        popupConfigSpy.and.returnValue(of({
            childWindowPath: 'iframe/path.html'
        } as Partial<PopupAuthorizationConfig>));

        const docSpyObj = jasmine.createSpyObj<Document>('document', ['createElement']);
        const docSpy = spyOnGet(TestBed.get(WINDOW_REF) as Window, 'document');
        docSpy.and.returnValue(docSpyObj);
        // tslint:disable-next-line: deprecation
        docSpyObj.createElement.and.returnValue(jasmine.createSpyObj<HTMLIFrameElement>('Iframe', ['contentWindow']));

        windowSpy.addEventListener.and.callFake((name: string, handler: EventListenerOrEventListenerObject) => {
            postToWindow = handler as EventListener;
        });
        windowSpy.open.and.returnValue(childWindowSpy as any);

        spyOnGet(TestBed.get(WINDOW_REF), 'screen')
            .and.returnValue({
                width: 123,
                height: 123
            });

        tokenStorageSpy.storeAuthorizationCode.and.returnValue(of({} as any));
        oidcCodeFlowClientSpy.codeFlowCallback.and.returnValue(of({} as any));
        oidcCodeFlowClientSpy.generateCodeFlowMetadata.and.returnValue(of({} as any));
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

        expect(oidcCodeFlowClientSpy.codeFlowCallback).toHaveBeenCalledWith(expectedUrl, iframeUrl, {});
    }));

    it('Validates the callback', fakeAsync(() => {

        const state = 'state';
        const expectedUrl = `${iframeUrl}?code=auth-code`;
        const metadata = { state };
        oidcCodeFlowClientSpy.generateCodeFlowMetadata.and.returnValue(of(metadata as any));

        popupClient.startCodeFlowInPopup()
            .subscribe();

        postToWindow(new MessageEvent('message', {
            data: expectedUrl,
            origin: expectedOrigin
        }));

        flush();

        expect(oidcCodeFlowClientSpy.codeFlowCallback).toHaveBeenCalledWith(expectedUrl, iframeUrl, metadata);
    }));

    it('Reacts when window is closed', fakeAsync(() => {

        const state = 'state';
        const expectedUrl = `${iframeUrl}?code=auth-code`;
        const metadata = { state };
        oidcCodeFlowClientSpy.generateCodeFlowMetadata.and.returnValue(of(metadata as any));

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
