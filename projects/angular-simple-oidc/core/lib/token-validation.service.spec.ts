import { TestBed, inject, async } from '@angular/core/testing';
import { TokenHelperService } from './token-helper.service';
import { TokenValidationService } from './token-validation.service';
import { TokenCryptoService } from './token-crypto.service';
import { DecodedIdentityToken, LocalState, TokenValidationConfig } from './models';
import { JWTKeys } from './models';

import {
  InvalidStateError,
  AuthorizationCallbackError,
  AuthorizationCallbackMissingParameterError,
  IdentityTokenMalformedError,
  JWTKeysMissingError,
  SignatureAlgorithmNotSupportedError,
  JWTKeysInvalidError,
  InvalidSignatureError,
  InvalidNonceError,
  ClaimRequiredError,
  ClaimTypeInvalidError,
  DateClaimInvalidError,
  IssuedAtValidationFailedError,
  IssuerValidationFailedError,
  AudienceValidationFailedError,
  TokenExpiredError,
  AccessTokenHashValidationFailedError
} from './token-validation-errors';
import { RequiredParemetersMissingError } from './errors';

// https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation

describe('TokenValidationService', () => {
  let tokenCryptoSpy: jasmine.SpyObj<TokenCryptoService>;

  let decodedIdToken: DecodedIdentityToken;
  let dummyKeys: JWTKeys;
  let clientId: string;

  beforeEach(() => {
    tokenCryptoSpy = jasmine.createSpyObj('TokenCryptoService', ['sha256b64First128Bits', 'verifySignature']);

    decodedIdToken = {
      iss: 'http://auth.example.com',
      sub: '248289761001',
      aud: 'test.client',
      nonce: 'n - 0S6_WzA2Mj',
      exp: 1311281970,
      iat: 1311280970,
      auth_time: 1311280970,
      amr: 'password',
      at_hash: 'hash',
      idp: 'identityserver',
      nbf: 1,
      sid: 'sid',
    };

    clientId = 'test.client';

    dummyKeys = {
      keys: [
        {
          kty: 'RSA',
          e: 'AQAB',
          use: 'sig',
          // alg: 'RS256',
          kid: '',
          n: ''
        }
      ]
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: TokenCryptoService,
          useValue: tokenCryptoSpy
        },
        {
          provide: TokenHelperService,
          useClass: TokenHelperService,
        },
        TokenValidationService
      ]
    });
  });

  it('should be created', () => {
    const service = TestBed.get(TokenValidationService);
    expect(service).toBeTruthy();
  });

  describe('The Issuer Identifier for the OpenID Provider MUST exactly match the value of the iss (issuer) Claim.', () => {

    it('should not throw if issuers match', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const issuer = decodedIdToken.iss;
          expect(() => tokenValidation.validateIdTokenIssuer(decodedIdToken, issuer))
            .not.toThrow();
        })
    ));

    it('should throw if issuers don\'t match', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const issuer = 'myissuerwichdoesnotmatch';
          expect(() => tokenValidation.validateIdTokenIssuer(decodedIdToken, issuer))
            .toThrow(new IssuerValidationFailedError(decodedIdToken.iss, issuer, null));
        })
    ));
  });

  describe(`The Client MUST validate that the aud (audience) Claim contains its client_id value registered
  at the Issuer identified by the iss (issuer) Claim as an audience.
  The ID Token MUST be rejected if the ID Token does not list the Client as a valid audience,
  or if it contains additional audiences not trusted by the Client.`, () => {

      it('should not throw if idToken\'s aud matches client exactly', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            expect(() => tokenValidation.validateIdTokenAud(decodedIdToken, clientId))
              .not.toThrow();
          })
      ));

      it('should throw if aud does not match client', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.aud = 'myaudience';
            expect(() => tokenValidation.validateIdTokenAud(decodedIdToken, clientId))
              .toThrow(new AudienceValidationFailedError(decodedIdToken.aud, clientId, null));
          })
      ));

      it('should not throw if idToken\'s aud includes clientId', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.aud = [clientId, 'test.client2'];
            expect(() => tokenValidation.validateIdTokenAud(decodedIdToken, clientId))
              .not.toThrow();
          })
      ));

      it('should throw if idToken\'s aud does not include clientId', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.aud = ['another.client.no.match'];
            expect(() => tokenValidation.validateIdTokenAud(decodedIdToken, clientId))
              .toThrow(new AudienceValidationFailedError(decodedIdToken.aud.join(','), clientId, null));
          })
      ));

    });

  describe(`The Client MUST validate the signature of the ID Token according to JWS [JWS] using
  the algorithm specified in the alg Header Parameter of the JOSE Header.
  The Client MUST use the keys provided by the Issuer. The alg value SHOULD be RS256.`, () => {

      it('fail without JWT keys', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const idToken = 'idtoken';
            expect(() => tokenValidation.validateIdTokenSignature(idToken, null))
              .toThrow(new JWTKeysMissingError(null));
          })
      ));

      it('fail with empty JWT keys', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const idToken = 'idtoken';
            expect(() => tokenValidation.validateIdTokenSignature(idToken, { keys: null }))
              .toThrow(new JWTKeysMissingError(null));
          })
      ));

      it('fail if alg is not RSA', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const idToken = 'idtoken';
            spyOn(TestBed.get(TokenHelperService), 'getHeaderFromToken')
              .and.returnValue({
                alg: 'notRSA'
              });

            expect(() => tokenValidation.validateIdTokenSignature(idToken, dummyKeys))
              .toThrow(new SignatureAlgorithmNotSupportedError(null));
          })
      ));

      it('fail if no kid claim and no JWT keys with kty=rsa', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const idToken = 'idtoken';
            spyOn(TestBed.get(TokenHelperService), 'getHeaderFromToken')
              .and.returnValue({
                alg: 'RS256'
              });
            dummyKeys.keys[0].kty = 'notRSA';
            expect(() => tokenValidation.validateIdTokenSignature(idToken, dummyKeys))
              .toThrow(new JWTKeysInvalidError(null));
          })
      ));

      it('fail if no kid claim and no JWT keys withuse=sig', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const idToken = 'idtoken';
            spyOn(TestBed.get(TokenHelperService), 'getHeaderFromToken')
              .and.returnValue({
                alg: 'RS256'
              });
            dummyKeys.keys[0].use = 'notsig';
            expect(() => tokenValidation.validateIdTokenSignature(idToken, dummyKeys))
              .toThrow(new JWTKeysInvalidError(null));
          })
      ));

      it('should use proper key when multiple kids', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const idToken = 'idtoken';

            dummyKeys.keys[0].kid = 'k0';
            dummyKeys.keys.push({
              ...dummyKeys.keys[0],
              kid: 'k1'
            });

            spyOn(TestBed.get(TokenHelperService), 'getHeaderFromToken')
              .and.returnValue({
                alg: 'RS256',
                kid: 'k1'
              });
            tokenCryptoSpy.verifySignature.and.returnValue(true);

            expect(() => tokenValidation.validateIdTokenSignature(idToken, dummyKeys))
              .not.toThrow();
            expect(tokenCryptoSpy.verifySignature).toHaveBeenCalledWith(dummyKeys.keys[1], idToken);
          })
      ));

      it('should try other keys if no key with kid is found', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const idToken = 'idtoken';

            dummyKeys.keys[0].kid = 'k0';
            dummyKeys.keys.push({
              ...dummyKeys.keys[0],
              kid: 'k1'
            });

            spyOn(TestBed.get(TokenHelperService), 'getHeaderFromToken')
              .and.returnValue({
                alg: 'RS256',
                kid: 'invalid-kid'
              });
            tokenCryptoSpy.verifySignature.and.returnValue(true);

            expect(() => tokenValidation.validateIdTokenSignature(idToken, dummyKeys))
              .not.toThrow();
            expect(tokenCryptoSpy.verifySignature).toHaveBeenCalledWith(dummyKeys.keys[0], idToken);
          })
      ));

      it('should try all keys until one succeeds', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const idToken = 'idtoken';
            const keyThatWorks = 'keythatworks';

            dummyKeys.keys[0].kid = 'k0123';
            dummyKeys.keys.push({
              ...dummyKeys.keys[0],
              kid: keyThatWorks
            });

            spyOn(TestBed.get(TokenHelperService), 'getHeaderFromToken')
              .and.returnValue({
                alg: 'RS256',
              });
            tokenCryptoSpy.verifySignature.and.callFake((key) => {
              return key.kid === keyThatWorks;
            });

            expect(() => tokenValidation.validateIdTokenSignature(idToken, dummyKeys))
              .not.toThrow();
            expect(tokenCryptoSpy.verifySignature).toHaveBeenCalledWith(dummyKeys.keys[0], idToken);
            expect(tokenCryptoSpy.verifySignature).toHaveBeenCalledWith(dummyKeys.keys[1], idToken);
          })
      ));

      it('should try all keys until one succeeds despite of kid', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const idToken = 'idtoken';
            const keyThatWorks = 'keythatworks';

            dummyKeys.keys.push({
              ...dummyKeys.keys[0],
              kid: 'k0123'
            });
            dummyKeys.keys.push({
              ...dummyKeys.keys[0],
              kid: keyThatWorks
            });

            spyOn(TestBed.get(TokenHelperService), 'getHeaderFromToken')
              .and.returnValue({
                alg: 'RS256',
                kid: 'k0123'
              });

            tokenCryptoSpy.verifySignature.and.callFake((key) => {
              return key.kid === keyThatWorks;
            });

            expect(() => tokenValidation.validateIdTokenSignature(idToken, dummyKeys))
              .not.toThrow();
            expect(tokenCryptoSpy.verifySignature).toHaveBeenCalledWith(dummyKeys.keys[0], idToken);
            expect(tokenCryptoSpy.verifySignature).toHaveBeenCalledWith(dummyKeys.keys[1], idToken);
            expect(tokenCryptoSpy.verifySignature).toHaveBeenCalledWith(dummyKeys.keys[2], idToken);
          })
      ));

      it('fail if signature is invalid despite of kid', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const idToken = 'idtoken';

            dummyKeys.keys[0].kid = 'k0';
            dummyKeys.keys.push({
              ...dummyKeys.keys[0],
              kid: 'k1'
            });

            spyOn(TestBed.get(TokenHelperService), 'getHeaderFromToken')
              .and.returnValue({
                alg: 'RS256',
                kid: 'k1'
              });
            tokenCryptoSpy.verifySignature.and.returnValue(false);

            expect(() => tokenValidation.validateIdTokenSignature(idToken, dummyKeys))
              .toThrow(new InvalidSignatureError(null));
          })
      ));

      it('fail if signature is invalid', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const idToken = 'idtoken';
            spyOn(TestBed.get(TokenHelperService), 'getHeaderFromToken')
              .and.returnValue({
                alg: 'RS256'
              });
            {
              tokenCryptoSpy.verifySignature.and.returnValue(false);
              expect(() => tokenValidation.validateIdTokenSignature(idToken, dummyKeys))
                .toThrow(new InvalidSignatureError(null));
            }
            {
              tokenCryptoSpy.verifySignature.and.returnValue(true);
              expect(() => tokenValidation.validateIdTokenSignature(idToken, dummyKeys))
                .not.toThrow();
            }
          })
      ));

    });

  describe(`The current time MUST be before the time represented by the exp Claim
  (possibly allowing for some small leeway to account for clock skew)`, () => {

      it('exp is required', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.exp = null;
            expect(() => tokenValidation.validateIdTokenExpiration(decodedIdToken))
              .toThrow(new ClaimRequiredError('exp', null));
          })
      ));

      it('exp must be a number', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.exp = 'wacamole' as any;
            expect(() => tokenValidation.validateIdTokenExpiration(decodedIdToken))
              .toThrow(new ClaimTypeInvalidError('exp', 'number', 'string', null));
          })
      ));

      it('exp must be a valid number', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.exp = 0;
            expect(() => tokenValidation.validateIdTokenExpiration(decodedIdToken))
              .toThrow(new DateClaimInvalidError('exp', null));
          })
      ));

      it('exp must be a valid date', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            spyOn(TestBed.get(TokenHelperService), 'convertTokenClaimToDate').and.returnValue(null);
            expect(() => tokenValidation.validateIdTokenExpiration(decodedIdToken))
              .toThrow(new DateClaimInvalidError('exp', null));
          })
      ));

      it('exp is greater than now', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.exp = Date.now() / 1000 + 10 * 1000;

            expect(() => tokenValidation.validateIdTokenExpiration(decodedIdToken))
              .not.toThrow();
          })
      ));

      it('exp is greater than now with offset', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const offset = 1;
            decodedIdToken.exp = Date.now() / 1000;
            expect(() => tokenValidation.validateIdTokenExpiration(decodedIdToken, offset))
              .not.toThrow();
          })
      ));

      it('should throw if token is expired', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const time = Date.now() / 1000 - 10 * 1000;
            decodedIdToken.exp = time;

            expect(() => tokenValidation.validateIdTokenExpiration(decodedIdToken))
              .toThrow(new TokenExpiredError(new Date(time * 1000), null));
          })
      ));
    });

  describe(`The iat Claim can be used to reject tokens that were issued too far away from the current time,
    limiting the amount of time that nonces need to be stored to prevent attacks.
    The acceptable range is Client specific.`, () => {

      it('can be disabled through config', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const config: TokenValidationConfig = { disableIdTokenIATValidation: true };
            decodedIdToken.iat = Date.now() / 1000 - 1 * 1000;

            expect(() => tokenValidation.validateIdTokenIssuedAt(decodedIdToken, config))
              .not.toThrow();
          })
      ));

      it('iat must be a number', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.iat = 'wacamole' as any;
            expect(() => tokenValidation.validateIdTokenIssuedAt(decodedIdToken))
              .toThrow(new ClaimTypeInvalidError('iat', 'number', 'string', null));
          })
      ));

      it('iat must be a valid number', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.iat = 0;
            expect(() => tokenValidation.validateIdTokenIssuedAt(decodedIdToken))
              .toThrow(new DateClaimInvalidError('iat', null));
          })
      ));

      it('iat must be a valid date', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            spyOn(TestBed.get(TokenHelperService), 'convertTokenClaimToDate').and.returnValue(null);
            expect(() => tokenValidation.validateIdTokenIssuedAt(decodedIdToken))
              .toThrow(new DateClaimInvalidError('iat', null));
          })
      ));

      it('should throw if date diff with iat is greater than offset', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.iat = Date.now() / 1000 - 900;
            expect(() => tokenValidation.validateIdTokenIssuedAt(decodedIdToken))
              .toThrow(new IssuedAtValidationFailedError(5, null));
          })
      ));

      it('should allow configuring offset through config', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.iat = Date.now() / 1000 - 900;

            const config: TokenValidationConfig = {
              idTokenIATOffsetAllowed: 1000
            };

            expect(() => tokenValidation.validateIdTokenIssuedAt(decodedIdToken, config))
              .not.toThrow();
          })
      ));

      it('should not throw if iat is inside offset', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.iat = Date.now() / 1000;

            expect(() => tokenValidation.validateIdTokenIssuedAt(decodedIdToken))
              .not.toThrow();
          })
      ));

    });

  describe(`The value of the nonce Claim MUST be checked to verify that it is the same value as the one
  that was sent in the Authentication Request. The Client SHOULD check the nonce value for replay attacks.
    The precise method for detecting replay attacks is Client specific.`, () => {

      it('doesn\'t throw when nonces match', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const local = decodedIdToken.nonce;
            expect(() => tokenValidation.validateIdTokenNonce(decodedIdToken, local))
              .not.toThrow();
          })
      ));

      it('throws when nonces don\'t match', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const local = 'notthenonce';
            expect(() => tokenValidation.validateIdTokenNonce(decodedIdToken, local))
              .toThrow(new InvalidNonceError(null));
          })
      ));
    });

  describe(`Access Token Validation
    Hash the octets of the ASCII representation of the access_token with the hash algorithm specified in JWA
    for the alg Header Parameter of the ID Token's JOSE Header.
    Take the left- most half of the hash and base64url- encode it.
    The value of at_hash in the ID Token MUST match the value produced in the previous step if at_hash
    is present in the ID Token`, () => {

      it('should not throw if at_hash matches hash of access_token', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const accessToken = 'myAccessToken';
            const atHash = 'hash';

            tokenCryptoSpy.sha256b64First128Bits.and.returnValue(atHash);

            expect(() => tokenValidation.validateAccessToken(accessToken, atHash))
              .not.toThrow();
          })
      ));

      it('should throw if at_hash does not match hash of access_token', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const accessToken = 'myAccessToken';
            const atHash = 'fakehash';

            tokenCryptoSpy.sha256b64First128Bits.and.returnValue('correcthash');

            expect(() => tokenValidation.validateAccessToken(accessToken, atHash))
              .toThrow(new AccessTokenHashValidationFailedError(null));
          })
      ));

      it('should not throw if at_hash is not present', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const accessToken = 'myAccessToken';
            const atHash = null;
            expect(() => tokenValidation.validateAccessToken(accessToken, atHash))
              .not.toThrow();
          })
      ));
    });

  describe('Token required fields', () => {

    it('should validate required fields', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const requiredClaims = ['iss', 'sub', 'aud', 'exp', 'iat'];
          for (const claim of requiredClaims) {
            requiredClaims.forEach(c => decodedIdToken[c] = 'someval');
            delete decodedIdToken[claim];
            expect(() => tokenValidation.validateIdTokenRequiredFields(decodedIdToken))
              .toThrow(new ClaimRequiredError(claim, null));
          }
        })
    ));

    it('should return true when all fields present', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          expect(() => tokenValidation.validateIdTokenRequiredFields(decodedIdToken))
            .not.toThrow();
        })
    ));
  });

  describe('Validation runner', () => {
    const validatorFns: (keyof TokenValidationService)[] = [
      'validateIdTokenSignature',
      'validateIdTokenNonce',
      'validateIdTokenRequiredFields',
      'validateIdTokenIssuedAt',
      'validateIdTokenIssuer',
      'validateIdTokenAud',
      'validateIdTokenExpiration'
    ];

    it('should run all validation functions', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {

          for (const validationFn of validatorFns) {
            spyOn(tokenValidation, validationFn)
              .and.returnValue();
          }
          const idToken = 'idToken';

          expect(() => tokenValidation.validateIdToken(
            clientId,
            idToken, decodedIdToken, 'nonce', {} as any, {} as any))
            .not.toThrow();

          for (const validationFn of validatorFns) {
            expect(tokenValidation[validationFn]).toHaveBeenCalled();
          }
        })
    ));
  });

  describe('Get numeric claim from token', () => {
    it('claim is required', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const token = {} as any as DecodedIdentityToken;
          expect(() => tokenValidation.validateTokenNumericClaim(token, 'myclaim'))
            .toThrow(new ClaimRequiredError('myclaim', null));
        })
    ));

    it('claim must be a number', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const token = {
            myclaim: 'wacamole'
          } as any as DecodedIdentityToken;
          expect(() => tokenValidation.validateTokenNumericClaim(token, 'myclaim'))
            .toThrow(new ClaimTypeInvalidError('myclaim', 'number', 'string', null));
        })
    ));
  });

  describe('Validate Identity Token JWT format', () => {
    it('must be valid', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const token = null;
          expect(() => tokenValidation.validateIdTokenFormat(token))
            .toThrow(new RequiredParemetersMissingError('idToken', null));
        })
    ));

    it('must be valid string', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const token = '';
          expect(() => tokenValidation.validateIdTokenFormat(token))
            .toThrow(new RequiredParemetersMissingError('idToken', null));
        })
    ));

    it('must contain three slices separated by dots', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const token = 'token';
          expect(() => tokenValidation.validateIdTokenFormat(token))
            .toThrow(new IdentityTokenMalformedError(null));
        })
    ));

    it('must contain three slices separated by dots', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const token = 'header.payload';
          expect(() => tokenValidation.validateIdTokenFormat(token))
            .toThrow(new IdentityTokenMalformedError(null));
        })
    ));

    it('returns true when valid JWT format', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const token = 'header.payload.signature';
          expect(() => tokenValidation.validateIdTokenFormat(token))
            .not.toThrow();
        })
    ));
  });

  describe('Validate authorization callback', () => {
    it('doesn\'t throw when states matches', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const state = 'a';
          const localState = {
            state: 'a'
          } as LocalState;

          expect(() => tokenValidation.validateAuthorizeCallbackState(localState, state))
            .not.toThrow();
        })
    ));

    it('throws when states do not match', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const state = 'a';
          const localState = {
            state: 'abc'
          } as LocalState;
          const code = 'abc';

          expect(() => tokenValidation.validateAuthorizeCallbackState(localState, state))
            .toThrowError(InvalidStateError);
        })
    ));
  });

  describe('validateAuthorizeCallbackFormat', () => {
    it('throws when an error is returned', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const state = 'state';
          const code = 'code';
          const error = 'error';
          const href = 'example.com';

          expect(() => tokenValidation.validateAuthorizeCallbackFormat(code, state, error, href))
            .toThrow(new AuthorizationCallbackError(error, null));
        })
    ));

    it('throws when code is not present', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const state = 'state';
          const code = null;
          const error = null;
          const href = 'example.com';

          expect(() => tokenValidation.validateAuthorizeCallbackFormat(code, state, error, href))
            .toThrow(new AuthorizationCallbackMissingParameterError('code', null));
        })
    ));

    it('throws when state is not present', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const state = null;
          const code = 'code';
          const error = null;
          const href = 'example.com';

          expect(() => tokenValidation.validateAuthorizeCallbackFormat(code, state, error, href))
            .toThrow(new AuthorizationCallbackMissingParameterError('state', null));
        })
    ));

    it('doesn\'t throw when is ok', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const state = 'state';
          const code = 'code';
          const error = null;
          const href = 'example.com';

          expect(() => tokenValidation.validateAuthorizeCallbackFormat(code, state, error, href))
            .not.toThrow();
        })
    ));
  });
});
