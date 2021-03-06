import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { TokenStorageService } from './token-storage.service';
import { LOCAL_STORAGE_REF } from './providers';
import { TokenStorageKeys, LocalState, TokenRequestResult } from 'angular-simple-oidc/core';

describe('TokenStorageService', () => {
    let tokenStorage: TokenStorageService;
    let storageSpy: jasmine.SpyObj<Storage>;

    beforeEach(() => {
        storageSpy = jasmine.createSpyObj('Storage', ['setItem', 'getItem', 'removeItem']);

        TestBed.configureTestingModule({
            providers: [
                {
                    provide: LOCAL_STORAGE_REF,
                    useValue: storageSpy
                },
                TokenStorageService
            ],
        });

        tokenStorage = TestBed.get(TokenStorageService);
    });

    it('should create', () => {
        expect(tokenStorage).toBeTruthy();
    });

    describe('storePreAuthorizationState', () => {

        it('should store all params', fakeAsync(() => {
            const nonce = 'nonce';
            const state = 'state';
            const codeVerifier = 'codeVerifier';
            const preRedirectUrl = 'preRedirectUri';

            tokenStorage.storePreAuthorizationState({
                nonce, state, codeVerifier, preRedirectUrl
            }).subscribe();

            flush();

            expect(storageSpy.setItem).toHaveBeenCalledWith(TokenStorageKeys.Nonce, nonce);
            expect(storageSpy.setItem).toHaveBeenCalledWith(TokenStorageKeys.State, state);
            expect(storageSpy.setItem).toHaveBeenCalledWith(TokenStorageKeys.CodeVerifier, codeVerifier);
            expect(storageSpy.setItem).toHaveBeenCalledWith(TokenStorageKeys.PreRedirectUrl, preRedirectUrl);
        }));
    });

    describe('clearPreAuthorizationState', () => {

        it('should remove pre authorization state using storage', fakeAsync(() => {
            tokenStorage.clearPreAuthorizationState()
                .subscribe();

            flush();

            expect(storageSpy.removeItem).toHaveBeenCalledWith(TokenStorageKeys.Nonce);
            expect(storageSpy.removeItem).toHaveBeenCalledWith(TokenStorageKeys.State);
            expect(storageSpy.removeItem).toHaveBeenCalledWith(TokenStorageKeys.CodeVerifier);
            expect(storageSpy.removeItem).toHaveBeenCalledWith(TokenStorageKeys.PreRedirectUrl);
        }));
    });

    describe('storeAuthorizationCode', () => {

        it('should store authorization code using storage', fakeAsync(() => {
            const code = 'code';

            tokenStorage.storeAuthorizationCode(code).subscribe();

            flush();

            expect(storageSpy.setItem).toHaveBeenCalledWith(TokenStorageKeys.AuthorizationCode, code);
        }));
    });

    describe('storeOriginalIdToken', () => {

        it('should store original id token using storage', fakeAsync(() => {
            const idToken = 'code';

            tokenStorage.storeOriginalIdToken(idToken).subscribe();

            flush();

            expect(storageSpy.setItem).toHaveBeenCalledWith(TokenStorageKeys.OriginalIdentityToken, idToken);
        }));
    });

    describe('storeTokens', () => {

        it('should store all tokens using storage', fakeAsync(() => {
            const tokens: TokenRequestResult = {
                accessToken: 'accessToken',
                accessTokenExpiresAt: 123,
                idToken: 'idtoken',
                decodedIdToken: {} as any,
                refreshToken: 'refreshtoken'
            };

            tokenStorage.storeTokens(tokens).subscribe();

            flush();

            expect(storageSpy.setItem).toHaveBeenCalledWith(TokenStorageKeys.IdentityToken,
                tokens.idToken);
            expect(storageSpy.setItem).toHaveBeenCalledWith(TokenStorageKeys.AccessToken,
                tokens.accessToken);
            expect(storageSpy.setItem).toHaveBeenCalledWith(TokenStorageKeys.AccessTokenExpiration,
                tokens.accessTokenExpiresAt.toString());

            expect(storageSpy.setItem).toHaveBeenCalledWith(TokenStorageKeys.RefreshToken,
                tokens.refreshToken);
        }));

        it('should not store expiration if not present', fakeAsync(() => {
            const tokens: TokenRequestResult = {
                accessToken: 'accessToken',
                idToken: 'idtoken',
                decodedIdToken: {} as any,
                refreshToken: 'refreshtoken'
            };

            tokenStorage.storeTokens(tokens).subscribe();

            flush();

            expect(storageSpy.setItem).not.toHaveBeenCalledWith(TokenStorageKeys.AccessTokenExpiration, jasmine.objectContaining(tokens));
        }));

        it('should not store refresh token if not present', fakeAsync(() => {
            const tokens: TokenRequestResult = {
                accessToken: 'accessToken',
                idToken: 'idtoken',
                decodedIdToken: {} as any,
            };

            tokenStorage.storeTokens(tokens).subscribe();

            flush();

            expect(storageSpy.setItem).not.toHaveBeenCalledWith(TokenStorageKeys.RefreshToken, jasmine.objectContaining(tokens));
        }));
    });

    describe('currentState$', () => {

        it('returns latest state', fakeAsync(() => {

            const expected = '{}';
            storageSpy.getItem.and.returnValue(expected);

            tokenStorage.clearPreAuthorizationState()
                .subscribe();

            let currentState: LocalState;
            tokenStorage.currentState$
                .subscribe(st => currentState = st);
            flush();

            expect(currentState.accessToken).toEqual(expected);
        }));
    });

    describe('removeAll', () => {

        it('removes each key one by one', fakeAsync(() => {

            tokenStorage.removeAll().subscribe();

            for (const k of Object.keys(TokenStorageKeys)) {
                expect(storageSpy.removeItem).toHaveBeenCalledWith(TokenStorageKeys[k]);
            }
        }));
    });
});
