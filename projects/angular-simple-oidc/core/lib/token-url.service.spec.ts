import { TestBed } from '@angular/core/testing';
import { TokenUrlService } from './token-url.service';
import { TokenCryptoService } from './token-crypto.service';
import { RequiredParemetersMissingError } from './errors';

describe('TokenUrlService', () => {
  let tokenCryptoSpy: Partial<Record<keyof TokenCryptoService, jest.Mock>>;
  let tokenUrl: TokenUrlService;

  beforeEach(() => {
    tokenCryptoSpy = {
      'generateState': jest.fn(),
      'generateNonce': jest.fn(),
      'generateCodesForCodeVerification': jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: TokenCryptoService,
          useValue: tokenCryptoSpy
        },
        TokenUrlService
      ],
    });
  });

  beforeEach(() => {
    tokenUrl = TestBed.get(TokenUrlService);
  });

  it('should create', () => {
    expect(tokenUrl).toBeTruthy();
  });

  describe('createAuthorizeUrl', () => {

    it('throw if required url is missing', () => {
      expect(() => {
        tokenUrl.createAuthorizeUrl(null, null);
      }).toThrow(new RequiredParemetersMissingError(`authorizeEndpointUrl`, null));
    });

    it('throw if required params are missing', () => {
      expect(() => {
        tokenUrl.createAuthorizeUrl('http://example.com', null);
      }).toThrow(new RequiredParemetersMissingError(`params`, null));
    });

    it('throw if required params are missing', () => {
      expect(() => {
        tokenUrl.createAuthorizeUrl('http://example.com', {
        } as any);
      }).toThrow(new RequiredParemetersMissingError(`clientId`, null));
    });

    it('uses tokenCrypto to obtain state', () => {
      const expected = 'S123';
      tokenCryptoSpy.generateState.mockReturnValue(expected);
      tokenCryptoSpy.generateCodesForCodeVerification.mockReturnValue({
        codeVerifier: 'verifier',
        codeChallenge: 'challenge',
        method: 'S256'
      });

      const output = tokenUrl.createAuthorizeUrl('http://example.com', {
        clientId: 'myclient',
        redirectUri: 'redirecturi',
        scope: 'scope',
        responseType: 'code'
      });
      expect(output.state).toEqual(expected);
    });

    it('uses tokenCrypto to obtain nonce', () => {
      const expected = 'N123';
      tokenCryptoSpy.generateNonce.mockReturnValue(expected);
      tokenCryptoSpy.generateCodesForCodeVerification.mockReturnValue({
        codeVerifier: 'verifier',
        codeChallenge: 'challenge',
        method: 'S256'
      });

      const output = tokenUrl.createAuthorizeUrl('http://example.com', {
        clientId: 'myclient',
        redirectUri: 'redirecturi',
        scope: 'scope',
        responseType: 'code'
      });
      expect(output.nonce).toEqual(expected);
    });

    it('generates URL using parameters', () => {
      const nonce = 'N123';
      tokenCryptoSpy.generateNonce.mockReturnValue(nonce);

      const state = 'S123';
      tokenCryptoSpy.generateState.mockReturnValue(state);

      const verif = {
        codeVerifier: 'verifier',
        codeChallenge: 'challenge',
        method: 'S256'
      };
      tokenCryptoSpy.generateCodesForCodeVerification.mockReturnValue(verif);

      const urlParams = {
        clientId: 'myclient',
        redirectUri: 'redirecturi',
        scope: 'scope',
        responseType: 'code' as any
      };

      const { url } = tokenUrl.createAuthorizeUrl('http://example.com', urlParams);

      expect(url).toContain(`client_id=${urlParams.clientId}`);
      expect(url).toContain(`redirect_uri=${urlParams.redirectUri}`);
      expect(url).toContain(`scope=${urlParams.scope}`);
      expect(url).toContain(`response_type=${urlParams.responseType}`);

      expect(url).toContain(`state=${state}`);
      expect(url).toContain(`nonce=${nonce}`);

      expect(url).toContain(`code_challenge=${verif.codeChallenge}`);
      expect(url).toContain(`code_challenge_method=${verif.method}`);

    });

    it('generates URL using optional parameters', () => {
      const nonce = 'N123';
      tokenCryptoSpy.generateNonce.mockReturnValue(nonce);

      const state = 'S123';
      tokenCryptoSpy.generateState.mockReturnValue(state);

      const verif = {
        codeVerifier: 'verifier',
        codeChallenge: 'challenge',
        method: 'S256'
      };
      tokenCryptoSpy.generateCodesForCodeVerification.mockReturnValue(verif);

      const urlParams = {
        clientId: 'myclient',
        redirectUri: 'redirecturi',
        scope: 'scope',
        responseType: 'code' as any,

        prompt: 'prompt',
        uiLocales: 'ui-locales',
        loginHint: 'login-hint',
        acrValues: 'acr-values',
      };

      const { url } = tokenUrl.createAuthorizeUrl('http://example.com', urlParams);

      expect(url).toContain(`prompt=${urlParams.prompt}`);
      expect(url).toContain(`ui_locales=${urlParams.uiLocales}`);
      expect(url).toContain(`login_hint=${urlParams.loginHint}`);
      expect(url).toContain(`acr_values=${urlParams.acrValues}`);

    });

  });

  describe('parseAuthorizeCallbackParamsFromUrl', () => {
    it('throws if no url is provided', () => {
      const url = '';
      expect(() => tokenUrl.parseAuthorizeCallbackParamsFromUrl(url))
        .toThrow(new RequiredParemetersMissingError(`url`, null));
    });

    it('throws if no url is provided', () => {
      const url = null;
      expect(() => tokenUrl.parseAuthorizeCallbackParamsFromUrl(url))
        .toThrow(new RequiredParemetersMissingError(`url`, null));
    });

    it('throws if url has no params', () => {
      const url = 'http://example.com';
      expect(() => tokenUrl.parseAuthorizeCallbackParamsFromUrl(url))
        .toThrow(new RequiredParemetersMissingError(`url must have params`, null));
    });

    it('throws if url has no params', () => {
      const url = 'http://example.com?';
      expect(() => tokenUrl.parseAuthorizeCallbackParamsFromUrl(url))
        .toThrow(new RequiredParemetersMissingError(`url must have params`, null));
    });

    it('parses params correctly', () => {
      const code = 'code-abc';
      const state = 'state-okei';
      const error = 'error-wuey';
      const sessionState = 'sess-state-123';
      const url = `http://example.com/oauth?code=${code}&state=${state}&error=${error}&session_state=${sessionState}`;

      const output = tokenUrl.parseAuthorizeCallbackParamsFromUrl(url);

      expect(output.code).toEqual(code);
      expect(output.state).toEqual(state);
      expect(output.error).toEqual(error);
      expect(output.sessionState).toEqual(sessionState);
    });
  });

  describe('createRefreshTokenRequestPayload', () => {
    it('creates refresh token url properly', () => {
      const clientId = 'client.id';
      const secret = 'secret';
      const scope = 'scopes';
      const refreshToken = 'refresh-token';
      const acr = 'acr';
      const output = tokenUrl.createRefreshTokenRequestPayload({
        clientId: clientId,
        clientSecret: secret,
        scope: scope,
        refreshToken: refreshToken,
        acrValues: acr
      });

      expect(output).toContain(`client_id=${clientId}`);
      expect(output).toContain(`client_secret=${secret}`);
      expect(output).toContain(`scope=${scope}`);
      expect(output).toContain(`refresh_token=${refreshToken}`);
      expect(output).toContain(`acr_values=${acr}`);
      expect(output).toContain(`grant_type=refresh_token`);
    });

    it('creates refresh token url without scope properly', () => {
      const clientId = 'client.id';
      const secret = 'secret';
      const refreshToken = 'refresh-token';
      const acr = 'acr';
      const output = tokenUrl.createRefreshTokenRequestPayload({
        clientId: clientId,
        clientSecret: secret,
        refreshToken: refreshToken,
        acrValues: acr
      });

      expect(output).toContain(`client_id=${clientId}`);
      expect(output).toContain(`client_secret=${secret}`);
      expect(output).toContain(`refresh_token=${refreshToken}`);
      expect(output).toContain(`acr_values=${acr}`);
      expect(output).toContain(`grant_type=refresh_token`);
    });

    it('creates refresh token url without acr_values properly', () => {
      const clientId = 'client.id';
      const secret = 'secret';
      const refreshToken = 'refresh-token';
      const output = tokenUrl.createRefreshTokenRequestPayload({
        clientId: clientId,
        clientSecret: secret,
        refreshToken: refreshToken,
      });

      expect(output).toContain(`client_id=${clientId}`);
      expect(output).toContain(`client_secret=${secret}`);
      expect(output).toContain(`refresh_token=${refreshToken}`);
      expect(output).toContain(`grant_type=refresh_token`);
    });
  });


  describe('createAuthorizationCodeRequestPayload', () => {
    it('creates authorization code url properly', () => {
      const clientId = 'client.id';
      const secret = 'secret';
      const scope = 'scopes';
      const code = 'auth-code';
      const codeVerifier = 'code-verifier';
      const redirectUri = 'redirectUri';
      const acr = 'acr';
      const output = tokenUrl.createAuthorizationCodeRequestPayload({
        clientId: clientId,
        clientSecret: secret,
        scope: scope,
        code: code,
        codeVerifier: codeVerifier,
        redirectUri: redirectUri,
        acrValues: acr
      });

      expect(output).toContain(`client_id=${clientId}`);
      expect(output).toContain(`client_secret=${secret}`);
      expect(output).toContain(`scope=${scope}`);
      expect(output).toContain(`code=${code}`);
      expect(output).toContain(`code_verifier=${codeVerifier}`);
      expect(output).toContain(`redirect_uri=${redirectUri}`);
      expect(output).toContain(`acr_values=${acr}`);
      expect(output).toContain(`grant_type=authorization_code`);
    });

    it('creates authorization code url without scope properly', () => {
      const clientId = 'client.id';
      const secret = 'secret';
      const code = 'auth-code';
      const codeVerifier = 'code-verifier';
      const redirectUri = 'redirectUri';
      const acr = 'acr';
      const output = tokenUrl.createAuthorizationCodeRequestPayload({
        clientId: clientId,
        clientSecret: secret,
        code: code,
        codeVerifier: codeVerifier,
        redirectUri: redirectUri,
        acrValues: acr
      });

      expect(output).toContain(`client_id=${clientId}`);
      expect(output).toContain(`client_secret=${secret}`);
      expect(output).toContain(`code=${code}`);
      expect(output).toContain(`code_verifier=${codeVerifier}`);
      expect(output).toContain(`redirect_uri=${redirectUri}`);
      expect(output).toContain(`acr_values=${acr}`);
      expect(output).toContain(`grant_type=authorization_code`);
    });

    it('creates authorization code url without acr_values properly', () => {
      const clientId = 'client.id';
      const secret = 'secret';
      const code = 'auth-code';
      const codeVerifier = 'code-verifier';
      const redirectUri = 'redirectUri';
      const output = tokenUrl.createAuthorizationCodeRequestPayload({
        clientId: clientId,
        clientSecret: secret,
        code: code,
        codeVerifier: codeVerifier,
        redirectUri: redirectUri,
      });

      expect(output).toContain(`client_id=${clientId}`);
      expect(output).toContain(`client_secret=${secret}`);
      expect(output).toContain(`code=${code}`);
      expect(output).toContain(`code_verifier=${codeVerifier}`);
      expect(output).toContain(`redirect_uri=${redirectUri}`);
      expect(output).toContain(`grant_type=authorization_code`);
    });

    it('redirect_uri is URLEncoded', () => {
      const clientId = 'client.id';
      const secret = 'secret';
      const code = 'auth-code';
      const codeVerifier = 'code-verifier';
      const redirectUri = 'http://example.com/identity token encoded';
      const output = tokenUrl.createAuthorizationCodeRequestPayload({
        clientId: clientId,
        clientSecret: secret,
        code: code,
        codeVerifier: codeVerifier,
        redirectUri: redirectUri,
      });

      expect(output).toContain(`client_id=${clientId}`);
      expect(output).toContain(`client_secret=${secret}`);
      expect(output).toContain(`code=${code}`);
      expect(output).toContain(`code_verifier=${codeVerifier}`);
      expect(output).toContain(`redirect_uri=${encodeURI(redirectUri)}`);
      expect(output).toContain(`grant_type=authorization_code`);
    });
  });

  describe('createEndSessionUrl', () => {
    it('throws if end session url is missing', () => {
      expect(() => {
        tokenUrl.createEndSessionUrl(null, null);
      }).toThrow(new RequiredParemetersMissingError(`endSessionEndpointUrl`, null));
    });

    it('uses tokenCrypto to obtain state', () => {
      const expected = 'S123';
      tokenCryptoSpy.generateState.mockReturnValue(expected);

      const idTokenHint = 'id-token';
      const postLogoutRedirectUri = 'http://post-logout';

      const output = tokenUrl.createEndSessionUrl('http://example.com', {
        idTokenHint,
        postLogoutRedirectUri,
      });

      expect(output.state).toEqual(expected);
    });

    it('generates url with params', () => {
      const expected = 'S123';
      tokenCryptoSpy.generateState.mockReturnValue(expected);

      const idTokenHint = 'id-token';
      const postLogoutRedirectUri = 'http://post-logout';

      const output = tokenUrl.createEndSessionUrl('http://example.com', {
        idTokenHint,
        postLogoutRedirectUri,
      });

      expect(output.url).toContain(`id_token_hint=${idTokenHint}`);
      expect(output.url).toContain(`post_logout_redirect_uri=${postLogoutRedirectUri}`);
    });

    it('generates url without params', () => {
      const state = 'S123';
      tokenCryptoSpy.generateState.mockReturnValue(state);

      const output = tokenUrl.createEndSessionUrl('http://example.com');

      expect(output.url).toContain(`state=${state}`);
    });

  });
});
