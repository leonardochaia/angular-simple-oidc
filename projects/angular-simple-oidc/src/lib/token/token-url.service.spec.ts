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
        tokenUrl.createAuthorizeUrl("http://example.com", null);
      }).toThrowError(/params(.*)required/);
    });

    it('throw if required params are missing', () => {
      expect(() => {
        tokenUrl.createAuthorizeUrl("http://example.com", {
        } as any);
      }).toThrowError(/clientId(.*)required/);
    });

  });

  describe('parseAuthorizeCallbackParamsFromUrl', () => {
    it('throws if no url is provided', () => {
      const url = '';
      expect(() => tokenUrl.parseAuthorizeCallbackParamsFromUrl(url))
        .toThrowError(/url(.*)required/);
    })

    it('throws if no url is provided', () => {
      const url = null;
      expect(() => tokenUrl.parseAuthorizeCallbackParamsFromUrl(url))
        .toThrowError(/url(.*)required/);
    })

    it('throws if url has no params', () => {
      const url = 'http://example.com';
      expect(() => tokenUrl.parseAuthorizeCallbackParamsFromUrl(url))
        .toThrowError(/params(.*)/);
    })

    it('throws if url has no params', () => {
      const url = 'http://example.com?';
      expect(() => tokenUrl.parseAuthorizeCallbackParamsFromUrl(url))
        .toThrowError(/params(.*)/);
    })

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
});
