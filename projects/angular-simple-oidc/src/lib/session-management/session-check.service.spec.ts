import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { DiscoveryDocument, LocalState, TokenUrlService } from 'angular-simple-oidc/core';
import { of } from 'rxjs';
import { SessionCheckService } from './session-check.service';
import { OidcDiscoveryDocClient } from '../discovery-document/oidc-discovery-doc-client.service';
import { TokenStorageService } from '../token-storage.service';
import { EventsService } from 'angular-simple-oidc/events';
import { DynamicIframeService } from '../dynamic-iframe/dynamic-iframe.service';
import { WINDOW_REF, AUTH_CONFIG_SERVICE } from '../providers';
import { AuthConfig } from '../config/models';
import { SessionCheckNotSupportedError, SessionCheckFailedError } from './errors';
import { DynamicIframe } from '../dynamic-iframe/dynamic-iframe';
import { take } from 'rxjs/operators';
import { SessionChangedEvent } from './events';
import { SESSION_MANAGEMENT_CONFIG_SERVICE } from './providers';
import { ConfigService } from 'angular-simple-oidc/config';
import { SessionManagementConfig } from './models';
import { spyOnGet } from '../../../test-utils';


describe('Session Check Service', () => {
    let sessionCheck: SessionCheckService;
    let windowSpy: jasmine.SpyObj<Window>;
    let discoveryDocClientSpy: jasmine.SpyObj<OidcDiscoveryDocClient>;
    let discoveryDocSpy: jasmine.Spy<jasmine.Func>;
    let dynamicIframeServiceSpy: jasmine.SpyObj<DynamicIframeService>;
    let dynamicIframeSpy: jasmine.SpyObj<DynamicIframe>;
    let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;
    let localStateSpy: jasmine.Spy<jasmine.Func>;
    let eventsSpy: jasmine.SpyObj<EventsService>;

    let configServiceSpy: jasmine.SpyObj<ConfigService<AuthConfig>>;
    let authConfigSpy: jasmine.Spy<jasmine.Func>;

    let sesionManagementConfigServiceSpy: jasmine.SpyObj<ConfigService<SessionManagementConfig>>;
    let sesionManagementConfigSpy: jasmine.Spy<jasmine.Func>;


    beforeEach(() => {
        windowSpy = jasmine.createSpyObj('window', ['addEventListener', 'removeEventListener']);
        discoveryDocClientSpy = jasmine.createSpyObj('OidcDiscoveryDocClient', ['current$']);
        dynamicIframeServiceSpy = jasmine.createSpyObj('DynamicIframeService', ['create']);
        tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['removeAll']);
        eventsSpy = jasmine.createSpyObj('EventsService', ['dispatch']);
        configServiceSpy = jasmine.createSpyObj('AuthConfigService', ['config']);
        dynamicIframeSpy = jasmine.createSpyObj('DynamicIframe', ['setSource', 'appendTo',
            'appendToBody', 'hide', 'postMessage', 'remove']);
        sesionManagementConfigServiceSpy = jasmine.createSpyObj('sesionManagementConfigService', ['current']);

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
                    provide: DynamicIframeService,
                    useValue: dynamicIframeServiceSpy
                },
                {
                    provide: SESSION_MANAGEMENT_CONFIG_SERVICE,
                    useValue: sesionManagementConfigServiceSpy
                },
                SessionCheckService
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

        authConfigSpy = spyOnGet(TestBed.get(AUTH_CONFIG_SERVICE) as ConfigService<AuthConfig>, 'current$');
        authConfigSpy.and.returnValue(of({
            clientId: 'client-id',
            openIDProviderUrl: 'http://my-idp/identity'
        } as Partial<AuthConfig>));

        sesionManagementConfigSpy = spyOnGet(
            TestBed.get(SESSION_MANAGEMENT_CONFIG_SERVICE) as ConfigService<SessionManagementConfig>, 'current$');
        sesionManagementConfigSpy.and.returnValue(of({
            opIframePollInterval: 1 * 1000
        } as Partial<SessionManagementConfig>));

        tokenStorageSpy.removeAll.and.returnValue(of({} as any));

        sessionCheck = TestBed.get(SessionCheckService);

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
    });

    it('should create', () => {
        expect(sessionCheck).toBeTruthy();
    });

    describe('Check session support', () => {
        it('throws if discovery document does not support iframe URL', fakeAsync(() => {
            discoveryDocSpy.and.returnValue(of({
                check_session_iframe: null
            } as Partial<DiscoveryDocument>));

            expect(() => {
                sessionCheck.startSessionCheck()
                    .subscribe();
                flush();
            })
                .toThrowError(SessionCheckNotSupportedError);
        }));

        it('throws if ther\'s no session state locally', fakeAsync(() => {
            localStateSpy.and.returnValue(of({
                identityToken: 'id-token',
                sessionState: null
            } as Partial<LocalState>));

            expect(() => {
                sessionCheck.startSessionCheck()
                    .subscribe();
                flush();
            })
                .toThrowError(SessionCheckNotSupportedError);
        }));
    });

    describe('iframe setup', () => {

        it('creates and hides the iframe', fakeAsync(() => {

            let postFromIframeToWindow: EventListener;
            windowSpy.addEventListener.and.callFake((name: string, handler: EventListenerOrEventListenerObject, options: any) => {
                postFromIframeToWindow = handler as EventListener;
            });

            sessionCheck.startSessionCheck()
                .pipe(take(1))
                .subscribe();

            tick(1000);
            const expectedOrigin = new URL('http://my-idp/identity').origin;

            postFromIframeToWindow(new MessageEvent('message', {
                data: 'changed',
                origin: expectedOrigin
            }));


            expect(dynamicIframeServiceSpy.create).toHaveBeenCalled();
            expect(dynamicIframeSpy.hide).toHaveBeenCalled();

            expect(dynamicIframeSpy.setSource).toHaveBeenCalledWith('http://check-session');
            expect(dynamicIframeSpy.appendToBody).toHaveBeenCalled();
        }));
    });

    describe('Session check messages', () => {
        it('polls OP iframe with correct message and origin', fakeAsync(() => {

            let postFromIframeToWindow: EventListener;
            windowSpy.addEventListener.and.callFake((name: string, handler: EventListenerOrEventListenerObject, options: any) => {
                postFromIframeToWindow = handler as EventListener;
            });

            sessionCheck.startSessionCheck()
                .pipe(take(1))
                .subscribe();

            tick(1000);

            const expectedMsg = `client-id session-state`;
            const expectedOrigin = new URL('http://my-idp/identity').origin;
            expect(dynamicIframeSpy.postMessage).toHaveBeenCalledWith(expectedMsg, expectedOrigin);

            postFromIframeToWindow(new MessageEvent('message', {
                data: 'unchanged',
                origin: expectedOrigin
            }));
        }));

        it('polls OP iframe and dispatches session changed', fakeAsync(() => {

            let postFromIframeToWindow: EventListener;
            windowSpy.addEventListener.and.callFake((name: string, handler: EventListenerOrEventListenerObject, options: any) => {
                postFromIframeToWindow = handler as EventListener;
            });

            let output: string;
            sessionCheck.startSessionCheck()
                .pipe(take(1))
                .subscribe(o => output = o);

            tick(1000);
            const expectedOrigin = new URL('http://my-idp/identity').origin;
            postFromIframeToWindow(new MessageEvent('message', {
                data: 'changed',
                origin: expectedOrigin
            }));

            expect(eventsSpy.dispatch).toHaveBeenCalledWith(new SessionChangedEvent());
            expect(output).toBe('changed');
        }));

        it('polls OP iframe and ignores unchanged', fakeAsync(() => {

            let postFromIframeToWindow: EventListener;
            windowSpy.addEventListener.and.callFake((name: string, handler: EventListenerOrEventListenerObject, options: any) => {
                postFromIframeToWindow = handler as EventListener;
            });

            let output: string;
            sessionCheck.startSessionCheck()
                .pipe(take(1))
                .subscribe(o => output = o);

            tick(1000);
            const expectedOrigin = new URL('http://my-idp/identity').origin;
            postFromIframeToWindow(new MessageEvent('message', {
                data: 'unchanged',
                origin: expectedOrigin
            }));

            flush();

            expect(output).toBe('unchanged');
        }));

        it('polls OP iframe and throws when error', fakeAsync(() => {

            let postFromIframeToWindow: EventListener;
            windowSpy.addEventListener.and.callFake((name: string, handler: EventListenerOrEventListenerObject, options: any) => {
                postFromIframeToWindow = handler as EventListener;
            });

            sessionCheck.startSessionCheck()
                .pipe(take(1))
                .subscribe();

            const expectedOrigin = new URL('http://my-idp/identity').origin;

            postFromIframeToWindow(new MessageEvent('message', {
                data: 'error',
                origin: expectedOrigin
            }));

            expect(() => flush())
                .toThrowError(SessionCheckFailedError);
        }));

    });

});
