import { TestBed } from '@angular/core/testing';
import { TokenUrlService } from './token-url.service';
import { TokenCryptoService } from './token-crypto.service';

describe('TokenUrlService', () => {
  let tokenCryptoSpy: jasmine.SpyObj<TokenCryptoService>;
  let tokenUrl: TokenUrlService;

  beforeEach(() => {
    tokenCryptoSpy = jasmine.createSpyObj('TokenCryptoService', ['generateState', 'generateNonce', 'generateCodesForCodeVerification']);

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
      }).toThrowError(/authorizeEndpointUrl(.*)required/);
    });

    it('throw if required params are missing', () => {
      expect(() => {
        tokenUrl.createAuthorizeUrl('http://example.com', null);
      }).toThrowError(/params(.*)required/);
    });

    it('throw if required params are missing', () => {
      expect(() => {
        tokenUrl.createAuthorizeUrl('http://example.com', {
        } as any);
      }).toThrowError(/clientId(.*)required/);
    });

    it('uses tokenCrypto to obtain state', () => {
      const expected = 'S123';
      tokenCryptoSpy.generateState.and.returnValue(expected);
      tokenCryptoSpy.generateCodesForCodeVerification.and.returnValue({
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
      tokenCryptoSpy.generateNonce.and.returnValue(expected);
      tokenCryptoSpy.generateCodesForCodeVerification.and.returnValue({
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

  });

  describe('parseAuthorizeCallbackParamsFromUrl', () => {
    it('throws if no url is provided', () => {
      const url = '';
      expect(() => tokenUrl.parseAuthorizeCallbackParamsFromUrl(url))
        .toThrowError(/url(.*)required/);
    });

    it('throws if no url is provided', () => {
      const url = null;
      expect(() => tokenUrl.parseAuthorizeCallbackParamsFromUrl(url))
        .toThrowError(/url(.*)required/);
    });

    it('throws if url has no params', () => {
      const url = 'http://example.com';
      expect(() => tokenUrl.parseAuthorizeCallbackParamsFromUrl(url))
        .toThrowError(/params(.*)/);
    });

    it('throws if url has no params', () => {
      const url = 'http://example.com?';
      expect(() => tokenUrl.parseAuthorizeCallbackParamsFromUrl(url))
        .toThrowError(/params(.*)/);
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
});
