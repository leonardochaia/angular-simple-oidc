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
});
