import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { DiscoveryDocument, LocalState, TokenUrlService } from 'angular-simple-oidc/core';
import { of } from 'rxjs';
import { OidcDiscoveryDocClient } from '../discovery-document/oidc-discovery-doc-client.service';
import { TokenStorageService } from '../token-storage.service';
import { EventsService } from 'angular-simple-oidc/events';
import { DynamicIframeService } from '../dynamic-iframe/dynamic-iframe.service';
import { WINDOW_REF, AUTH_CONFIG_SERVICE } from '../providers';
import { AuthConfig } from '../config/models';
import { DynamicIframe } from '../dynamic-iframe/dynamic-iframe';
import { AuthorizeEndpointSilentClientService } from './authorize-endpoint-silent-client.service';
import { OidcCodeFlowClient } from '../oidc-code-flow-client.service';
import { IframePostMessageTimeoutError } from './errors';
import { ConfigService } from 'angular-simple-oidc/config';
import { SESSION_MANAGEMENT_CONFIG_SERVICE } from './providers';
import { SessionManagementConfig } from './models';
import { spyOnGet } from '../../../test-utils';


describe('Authorize Endpoint Silent Client ', () => {
    let authorizeClientSilent: AuthorizeEndpointSilentClientService;
    let windowSpy: CustomMockObject<Window>;
    let discoveryDocClientSpy: CustomMockObject<OidcDiscoveryDocClient>;
    let discoveryDocSpy: jasmine.Spy<jasmine.Func>;
    let dynamicIframeServiceSpy: CustomMockObject<DynamicIframeService>;
    let dynamicIframeSpy: CustomMockObject<DynamicIframe>;
    let tokenStorageSpy: CustomMockObject<TokenStorageService>;
    let tokenUrlSpy: CustomMockObject<TokenUrlService>;
    let localStateSpy: jasmine.Spy<jasmine.Func>;
    let eventsSpy: CustomMockObject<EventsService>;
    let oidcCodeFlowClientSpy: CustomMockObject<OidcCodeFlowClient>;

    let configServiceSpy: CustomMockObject<ConfigService<AuthConfig>>;
    let authConfigSpy: jasmine.Spy<jasmine.Func>;

    let sessionConfigServiceSpy: CustomMockObject<ConfigService<SessionManagementConfig>>;
    let sessionConfigSpy: jasmine.Spy<jasmine.Func>;

    let postFromIframeToWindow: EventListener;
    const expectedOrigin = new URL('http://my-idp/identity').origin;

    const iframeUrl = 'http://base-url/iframe/path.html';

    beforeEach(() => {
        windowSpy = {
            'addEventListener': jest.fn(),
            'removeEventListener': jest.fn()
        };
        discoveryDocClientSpy = {
            'current$': jest.fn()
        };
        dynamicIframeServiceSpy = {
            'create': jest.fn()
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
        sessionConfigServiceSpy = {
            'current$': jest.fn()
        };
        oidcCodeFlowClientSpy = {
            'generateCodeFlowMetadata': jest.fn(),
            'codeFlowCallback': jest.fn()
        };
        dynamicIframeSpy = {
            'setSource': jest.fn(),
            'appendTo': jest.fn(),
            'appendToBody': jest.fn(),
            'hide': jest.fn(),
            'postMessage': jest.fn(),
            'remove': jest.fn()
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
                    useValue: dynamicIframeServiceSpy
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
                    provide: SESSION_MANAGEMENT_CONFIG_SERVICE,
                    useValue: sessionConfigServiceSpy
                },
                {
                    provide: DynamicIframeService,
                    useValue: dynamicIframeServiceSpy
                },
                {
                    provide: TokenUrlService,
                    useValue: tokenUrlSpy
                },
                {
                    provide: OidcCodeFlowClient,
                    useValue: oidcCodeFlowClientSpy
                },
                AuthorizeEndpointSilentClientService
            ],
        });

        discoveryDocSpy = spyOnGet(TestBed.get(OidcDiscoveryDocClient) as OidcDiscoveryDocClient, 'current$');
        discoveryDocSpy.mockReturnValue(of({
            check_session_iframe: 'http://check-session'
        } as Partial<DiscoveryDocument>));

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

        sessionConfigSpy = spyOnGet(
            TestBed.get(SESSION_MANAGEMENT_CONFIG_SERVICE) as ConfigService<SessionManagementConfig>,
            'current$');
        sessionConfigSpy.mockReturnValue(of({
            iframePath: 'iframe/path.html'
        } as Partial<SessionManagementConfig>));

        authorizeClientSilent = TestBed.get(AuthorizeEndpointSilentClientService);

        dynamicIframeServiceSpy.create.mockReturnValue(dynamicIframeSpy);
        dynamicIframeSpy.setSource.mockReturnValue(dynamicIframeSpy);
        dynamicIframeSpy.appendTo.mockReturnValue(dynamicIframeSpy);
        dynamicIframeSpy.appendToBody.mockReturnValue(dynamicIframeSpy);
        dynamicIframeSpy.hide.mockReturnValue(dynamicIframeSpy);

        const docSpyObj = {
            'createElement': jest.fn()
        };
        const docSpy = spyOnGet(TestBed.get(WINDOW_REF) as Window, 'document');
        docSpy.mockReturnValue(docSpyObj);
        // tslint:disable-next-line: deprecation
        docSpyObj.createElement.mockReturnValue({
            'contentWindow': jest.fn()
        });

        windowSpy.addEventListener.mockImplementation((name: string, handler: EventListenerOrEventListenerObject, options: any) => {
            postFromIframeToWindow = handler as EventListener;
        });

        tokenStorageSpy.storeAuthorizationCode.mockReturnValue(of({} as any));
        oidcCodeFlowClientSpy.codeFlowCallback.mockReturnValue(of({} as any));
        oidcCodeFlowClientSpy.generateCodeFlowMetadata.mockReturnValue(of({} as any));
    });

    it('should create', () => {
        expect(authorizeClientSilent).toBeTruthy();
    });

    it('Generates URL with id_token_hint and prompt none', fakeAsync(() => {

        authorizeClientSilent.startCodeFlowInIframe()
            .subscribe();

        postFromIframeToWindow(new MessageEvent('message', {
            data: iframeUrl,
            origin: expectedOrigin
        }));

        flush();

        expect(oidcCodeFlowClientSpy.generateCodeFlowMetadata)
            .toHaveBeenCalledWith({ redirectUri: iframeUrl, idTokenHint: 'id-token', prompt: 'none' });
    }));

    it('Obtains URL from iframe correctly', fakeAsync(() => {

        authorizeClientSilent.startCodeFlowInIframe()
            .subscribe();

        const expectedUrl = `${iframeUrl}?code=auth-code`;
        postFromIframeToWindow(new MessageEvent('message', {
            data: expectedUrl,
            origin: expectedOrigin
        }));

        flush();

        expect(oidcCodeFlowClientSpy.codeFlowCallback).toHaveBeenCalledWith(expectedUrl, iframeUrl, {} as any );
    }));

    it('Validates the callback', fakeAsync(() => {

        const state = 'state';
        const expectedUrl = `${iframeUrl}?code=auth-code`;
        const metadata = {
            state
        };
        oidcCodeFlowClientSpy.generateCodeFlowMetadata.mockReturnValue(of(metadata as any));

        authorizeClientSilent.startCodeFlowInIframe()
            .subscribe();

        postFromIframeToWindow(new MessageEvent('message', {
            data: expectedUrl,
            origin: expectedOrigin
        }));

        flush();

        expect(oidcCodeFlowClientSpy.codeFlowCallback).toHaveBeenCalledWith(expectedUrl, iframeUrl, metadata as any);
    }));

    it('Uses timeout if iframe never post back', fakeAsync(() => {

        const state = 'state';
        oidcCodeFlowClientSpy.generateCodeFlowMetadata.mockReturnValue(of({ state } as any));

        expect(() => {
            authorizeClientSilent.startCodeFlowInIframe()
                .subscribe();

            tick(10 * 1000);
        }).toThrowError(IframePostMessageTimeoutError);
    }));

});
