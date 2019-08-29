import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { DiscoveryDocument, LocalState, TokenUrlService } from 'angular-simple-oidc/core';
import { of } from 'rxjs';
import { OidcDiscoveryDocClient } from '../discovery-document/oidc-discovery-doc-client.service';
import { TokenStorageService } from '../token-storage.service';
import { EventsService } from '../events/events.service';
import { DynamicIframeService } from '../dynamic-iframe/dynamic-iframe.service';
import { WINDOW_REF } from '../constants';
import { AuthConfigService } from '../config/auth-config.service';
import { AuthConfig } from '../config/models';
import { DynamicIframe } from '../dynamic-iframe/dynamic-iframe';
import { AuthorizeEndpointSilentClientService } from './authorize-endpoint-silent-client.service';
import { OidcCodeFlowClient } from '../oidc-code-flow-client.service';
import { IframePostMessageTimeoutError } from './errors';

function spyOnGet<T>(obj: T, property: keyof T) {
    Object.defineProperty(obj, property, { get: () => null });
    return spyOnProperty(obj, property, 'get');
}

describe('Authorize Endpoint Silent Client ', () => {
    let authorizeClientSilent: AuthorizeEndpointSilentClientService;
    let windowSpy: jasmine.SpyObj<Window>;
    let discoveryDocClientSpy: jasmine.SpyObj<OidcDiscoveryDocClient>;
    let discoveryDocSpy: jasmine.Spy<InferableFunction>;
    let dynamicIframeServiceSpy: jasmine.SpyObj<DynamicIframeService>;
    let dynamicIframeSpy: jasmine.SpyObj<DynamicIframe>;
    let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;
    let tokenUrlSpy: jasmine.SpyObj<TokenUrlService>;
    let localStateSpy: jasmine.Spy<InferableFunction>;
    let eventsSpy: jasmine.SpyObj<EventsService>;
    let oidcCodeFlowClientSpy: jasmine.SpyObj<OidcCodeFlowClient>;

    let configServiceSpy: jasmine.SpyObj<AuthConfigService>;
    let authConfigSpy: jasmine.Spy<InferableFunction>;

    let postFromIframeToWindow: EventListener;
    const expectedOrigin = new URL('http://my-idp/identity').origin;

    beforeEach(() => {
        windowSpy = jasmine.createSpyObj('window', ['addEventListener', 'removeEventListener']);
        discoveryDocClientSpy = jasmine.createSpyObj('OidcDiscoveryDocClient', ['current$']);
        dynamicIframeServiceSpy = jasmine.createSpyObj('DynamicIframeService', ['create']);
        tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['storeAuthorizationCode']);
        tokenUrlSpy = jasmine.createSpyObj('TokenUrlService', ['createAuthorizationCodeRequestPayload']);
        eventsSpy = jasmine.createSpyObj('EventsService', ['dispatch']);
        configServiceSpy = jasmine.createSpyObj('AuthConfigService', ['config']);
        oidcCodeFlowClientSpy = jasmine.createSpyObj('OidcCodeFlowClient', ['generateCodeFlowMetadata',
            'parseCodeFlowCallbackParams', 'validateCodeFlowCallback', 'requestTokenWithAuthCode']);
        dynamicIframeSpy = jasmine.createSpyObj('DynamicIframe', ['setSource', 'appendTo',
            'appendToBody', 'hide', 'postMessage', 'remove']);

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
                    provide: AuthConfigService,
                    useValue: configServiceSpy
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
        discoveryDocSpy.and.returnValue(of({
            check_session_iframe: 'http://check-session'
        } as Partial<DiscoveryDocument>));

        localStateSpy = spyOnGet(TestBed.get(TokenStorageService) as TokenStorageService, 'currentState$');
        localStateSpy.and.returnValue(of({
            identityToken: 'id-token',
            sessionState: 'session-state'
        } as Partial<LocalState>));

        authConfigSpy = spyOnGet(TestBed.get(AuthConfigService) as AuthConfigService, 'configuration');
        authConfigSpy.and.returnValue({
            clientId: 'client-id',
            openIDProviderUrl: 'http://my-idp/identity'
        } as Partial<AuthConfig>);

        TestBed.get(AuthConfigService).baseUrl = 'http://base-url/';

        authorizeClientSilent = TestBed.get(AuthorizeEndpointSilentClientService);

        dynamicIframeServiceSpy.create.and.returnValue(dynamicIframeSpy);
        dynamicIframeSpy.setSource.and.returnValue(dynamicIframeSpy);
        dynamicIframeSpy.appendTo.and.returnValue(dynamicIframeSpy);
        dynamicIframeSpy.appendToBody.and.returnValue(dynamicIframeSpy);
        dynamicIframeSpy.hide.and.returnValue(dynamicIframeSpy);

        const docSpyObj = jasmine.createSpyObj<Document>('document', ['createElement']);
        const docSpy = spyOnGet(TestBed.get(WINDOW_REF) as Window, 'document');
        docSpy.and.returnValue(docSpyObj);
        // tslint:disable-next-line: deprecation
        docSpyObj.createElement.and.returnValue(jasmine.createSpyObj<HTMLIFrameElement>('Iframe', ['contentWindow']));

        windowSpy.addEventListener.and.callFake((name: string, handler: EventListenerOrEventListenerObject, options: any) => {
            postFromIframeToWindow = handler as EventListener;
        });

        tokenStorageSpy.storeAuthorizationCode.and.returnValue(of({} as any));
        oidcCodeFlowClientSpy.requestTokenWithAuthCode.and.returnValue(of({} as any));
        oidcCodeFlowClientSpy.generateCodeFlowMetadata.and.returnValue(of({} as any));
    });

    it('should create', () => {
        expect(authorizeClientSilent).toBeTruthy();
    });

    it('Generates URL with id_token_hint and prompt none', fakeAsync(() => {

        const iframeUrl = 'http://base-url/assets/oidc-iframe.html';

        authorizeClientSilent.startCodeFlowInIframe()
            .subscribe();

        postFromIframeToWindow(new MessageEvent('message', {
            data: iframeUrl,
            origin: expectedOrigin
        }));

        flush();

        expect(oidcCodeFlowClientSpy.generateCodeFlowMetadata)
            .toHaveBeenCalledWith(iframeUrl, 'id-token', 'none');
    }));

    it('Obtains URL from iframe correctly', fakeAsync(() => {

        const iframeUrl = 'http://base-url/assets/oidc-iframe.html';

        authorizeClientSilent.startCodeFlowInIframe()
            .subscribe();

        const expectedUrl = `${iframeUrl}?code=auth-code`;
        postFromIframeToWindow(new MessageEvent('message', {
            data: expectedUrl,
            origin: expectedOrigin
        }));

        flush();

        expect(oidcCodeFlowClientSpy.parseCodeFlowCallbackParams).toHaveBeenCalledWith(expectedUrl);
    }));

    it('Validates the callback', fakeAsync(() => {

        const iframeUrl = 'http://base-url/assets/oidc-iframe.html';

        const state = 'state';
        const expectedUrl = `${iframeUrl}?code=auth-code`;
        const paramsResult = {
            href: expectedUrl,
            code: 'auth-code',
            sessionState: 'session-state',
            error: null,
            state
        };
        oidcCodeFlowClientSpy.parseCodeFlowCallbackParams.and.returnValue(paramsResult);
        oidcCodeFlowClientSpy.generateCodeFlowMetadata.and.returnValue(of({ state } as any));

        authorizeClientSilent.startCodeFlowInIframe()
            .subscribe();

        postFromIframeToWindow(new MessageEvent('message', {
            data: expectedUrl,
            origin: expectedOrigin
        }));

        flush();

        expect(oidcCodeFlowClientSpy.validateCodeFlowCallback).toHaveBeenCalledWith(paramsResult, state);
    }));

    it('Uses timeout if iframe never post back', fakeAsync(() => {

        const iframeUrl = 'http://base-url/assets/oidc-iframe.html';

        const state = 'state';
        const expectedUrl = `${iframeUrl}?code=auth-code`;
        const paramsResult = {
            href: expectedUrl,
            code: 'auth-code',
            sessionState: 'session-state',
            error: null,
            state
        };
        oidcCodeFlowClientSpy.parseCodeFlowCallbackParams.and.returnValue(paramsResult);
        oidcCodeFlowClientSpy.generateCodeFlowMetadata.and.returnValue(of({ state } as any));

        expect(() => {
            authorizeClientSilent.startCodeFlowInIframe()
                .subscribe();

            tick(10 * 1000);
        }).toThrowError(IframePostMessageTimeoutError);
    }));

});
