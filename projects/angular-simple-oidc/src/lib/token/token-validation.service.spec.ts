import { TestBed, inject, async } from '@angular/core/testing';
import { TokenHelperService } from './token-helper.service';
import { TokenStorageService } from './token-storage.service';
import { TokenValidationService } from './token-validation.service';
import { TokenCryptoService } from './token-crypto.service';
import { of } from 'rxjs';
import { AuthConfigService } from '../config/auth-config.service';
import { OidcDiscoveryDocClient } from '../discovery-document/oidc-discovery-doc-client.service';
import { DecodedIdentityToken, LocalState } from './models';
import { AuthConfig } from '../config/models';
import { JWTKeys } from '../discovery-document/models';
import { ValidationResult } from './validation-result';

function spyOnGet<T>(obj: T, property: keyof T) {
  Object.defineProperty(obj, property, { get: () => null });
  return spyOnProperty(obj, property, 'get');
}
// https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation

describe('TokenValidationService', () => {
  let tokenCryptoSpy: jasmine.SpyObj<TokenCryptoService>;
  let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;
  let configServiceSpy: jasmine.SpyObj<AuthConfigService>;
  let discoveryDocClientSpy: jasmine.SpyObj<OidcDiscoveryDocClient>;
  let discoveryDocSpy: jasmine.Spy<InferableFunction>;
  let jwtKeysSpy: jasmine.Spy<InferableFunction>;
  let configSpy: jasmine.Spy<InferableFunction>;
  let currnetStateSpy: jasmine.Spy<InferableFunction>;

  let decodedIdToken: DecodedIdentityToken;
  let authConfig: AuthConfig;
  let dummyKeys: JWTKeys;

  beforeEach(() => {
    tokenCryptoSpy = jasmine.createSpyObj('TokenCryptoService', ['sha256b64First128Bits', 'verifySignature']);
    tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['obtainLocalAuthorizationState']);
    configServiceSpy = jasmine.createSpyObj('AuthConfigService', ['configuration']);
    discoveryDocClientSpy = jasmine.createSpyObj('OidcDiscoveryDocClient', ['current$']);

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

    authConfig = {
      clientId: 'test.client',
      tokenValidation: {}
    } as AuthConfig;

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
        {
          provide: TokenStorageService,
          useValue: tokenStorageSpy,
        },
        {
          provide: AuthConfigService,
          useValue: configServiceSpy,
        },
        {
          provide: OidcDiscoveryDocClient,
          useValue: discoveryDocClientSpy,
        },
        TokenValidationService
      ]
    });

    discoveryDocSpy = spyOnGet(TestBed.get(OidcDiscoveryDocClient) as OidcDiscoveryDocClient, 'current$');
    jwtKeysSpy = spyOnGet(TestBed.get(OidcDiscoveryDocClient) as OidcDiscoveryDocClient, 'jwtKeys$');
    currnetStateSpy = spyOnGet(TestBed.get(TokenStorageService) as TokenStorageService, 'currentState$');

    configSpy = spyOnGet(TestBed.get(AuthConfigService) as AuthConfigService, 'configuration')
      .and.returnValue(authConfig);
  });

  it('should be created', () => {
    const service = TestBed.get(TokenValidationService);
    expect(service).toBeTruthy();
  });

  describe('The Issuer Identifier for the OpenID Provider MUST exactly match the value of the iss (issuer) Claim.', () => {

    it('iss should match provided', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const issuer = decodedIdToken.iss;
          const output = tokenValidation.validateIdTokenIssuer(decodedIdToken, issuer);
          expect(output.success).toBeTruthy();
        })
    ));

    it('iss should not match provided', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const issuer = 'myissuerwichdoesnotmatch';
          const output = tokenValidation.validateIdTokenIssuer(decodedIdToken, issuer);
          expect(output.errorCode).toBe(ValidationResult.issValidationFailed().errorCode);
        })
    ));
  });

  describe(`The Client MUST validate that the aud (audience) Claim contains its client_id value registered
  at the Issuer identified by the iss (issuer) Claim as an audience.
  The ID Token MUST be rejected if the ID Token does not list the Client as a valid audience,
  or if it contains additional audiences not trusted by the Client.`, () => {

      it('aud should match string', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const output = tokenValidation.validateIdTokenAud(decodedIdToken);
            expect(output.success).toBeTruthy();
          })
      ));

      it('aud should not match string', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.aud = 'myaudience';
            const output = tokenValidation.validateIdTokenAud(decodedIdToken);
            expect(output.errorCode).toBe(ValidationResult.audValidationFailed().errorCode);
          })
      ));

      it('aud should match string[]', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.aud = [authConfig.clientId, 'test.client2'];
            const output = tokenValidation.validateIdTokenAud(decodedIdToken);
            expect(output.success).toBeTruthy();
          })
      ));

      it('aud should not match string[]', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.aud = ['another.client.no.match'];
            const output = tokenValidation.validateIdTokenAud(decodedIdToken);
            expect(output.errorCode).toBe(ValidationResult.audValidationFailed().errorCode);
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
            const output = tokenValidation.validateIdTokenSignature(idToken, null);
            expect(output.errorCode).toBe(ValidationResult.missingJWTKeys.errorCode);

          })
      ));

      it('fail with empty JWT keys', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const idToken = 'idtoken';
            const output = tokenValidation.validateIdTokenSignature(idToken, { keys: null });
            expect(output.errorCode).toBe(ValidationResult.missingJWTKeys.errorCode);
          })
      ));

      it('fail if token header invalid', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const idToken = 'idtoken';
            spyOn(TestBed.get(TokenHelperService), 'getHeaderFromToken').and.returnValue(null);

            const output = tokenValidation.validateIdTokenSignature(idToken, dummyKeys);
            expect(output.errorCode).toBe(ValidationResult.failedToObtainTokenHeader.errorCode);
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

            const output = tokenValidation.validateIdTokenSignature(idToken, dummyKeys);
            expect(output.errorCode).toBe(ValidationResult.onlyRSASupported.errorCode);
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
            const output = tokenValidation.validateIdTokenSignature(idToken, dummyKeys);
            expect(output.errorCode).toBe(ValidationResult.invalidJWTKeys.errorCode);
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
            const output = tokenValidation.validateIdTokenSignature(idToken, dummyKeys);
            expect(output.errorCode).toBe(ValidationResult.invalidJWTKeys.errorCode);
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

            const output = tokenValidation.validateIdTokenSignature(idToken, dummyKeys);
            expect(output.success).toBeTruthy();
            expect(tokenCryptoSpy.verifySignature).toHaveBeenCalledWith(dummyKeys.keys[1], idToken);
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
            tokenCryptoSpy.verifySignature.and.callFake((key, msg) => {
              return key.kid === keyThatWorks;
            });

            const output = tokenValidation.validateIdTokenSignature(idToken, dummyKeys);
            expect(output.success).toBeTruthy();
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

            tokenCryptoSpy.verifySignature.and.callFake((key, msg) => {
              return key.kid === keyThatWorks;
            });

            const output = tokenValidation.validateIdTokenSignature(idToken, dummyKeys);
            expect(output.success).toBeTruthy();
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

            const output = tokenValidation.validateIdTokenSignature(idToken, dummyKeys);
            expect(output.errorCode).toBe(ValidationResult.incorrectSignature.errorCode);
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
              const output = tokenValidation.validateIdTokenSignature(idToken, dummyKeys);
              expect(output.errorCode).toBe(ValidationResult.incorrectSignature.errorCode);
            }
            {
              tokenCryptoSpy.verifySignature.and.returnValue(true);
              const output = tokenValidation.validateIdTokenSignature(idToken, dummyKeys);
              expect(output.success).toBeTruthy();
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
            const output = tokenValidation.validateIdTokenExpiration(decodedIdToken);
            expect(output.errorCode).toBe(ValidationResult.claimRequired('exp').errorCode);
          })
      ));

      it('exp must be a number', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.exp = 'wacamole' as any;
            const output = tokenValidation.validateIdTokenExpiration(decodedIdToken);
            expect(output.errorCode).toBe(ValidationResult.claimTypeInvalid('exp', null, null).errorCode);
          })
      ));

      it('exp must be a valid number', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.exp = 0;
            const output = tokenValidation.validateIdTokenExpiration(decodedIdToken);
            expect(output.errorCode).toBe(ValidationResult.claimDateInvalid('exp').errorCode);
          })
      ));

      it('exp must be a valid date', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            spyOn(TestBed.get(TokenHelperService), 'convertTokenClaimToDate').and.returnValue(null);
            const output = tokenValidation.validateIdTokenExpiration(decodedIdToken);
            expect(output.errorCode).toBe(ValidationResult.claimDateInvalid('exp').errorCode);
          })
      ));

      it('exp is greater than now', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.exp = Date.now() / 1000 + 10 * 1000;

            const output = tokenValidation.validateIdTokenExpiration(decodedIdToken);
            expect(output.success).toBeTruthy();
          })
      ));

      it('exp is greater than now with offset', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const offset = 20;
            decodedIdToken.exp = Date.now() / 1000;
            const output = tokenValidation.validateIdTokenExpiration(decodedIdToken, offset);
            expect(output.success).toBeTruthy();
          })
      ));

      it('exp is lesser than now', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.exp = Date.now() / 1000 - 10 * 1000;

            const output = tokenValidation.validateIdTokenExpiration(decodedIdToken);
            expect(output.errorCode).toBe(ValidationResult.tokenExpired().errorCode);
          })
      ));
    });

  describe(`The iat Claim can be used to reject tokens that were issued too far away from the current time,
    limiting the amount of time that nonces need to be stored to prevent attacks.
    The acceptable range is Client specific.`, () => {

      it('can be disabled through config', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            authConfig.tokenValidation = { disableIdTokenIATValidation: true };
            decodedIdToken.iat = Date.now() / 1000 - 1 * 1000;

            const output = tokenValidation.validateIdTokenIssuedAt(decodedIdToken);
            expect(output.success).toBeTruthy();
          })
      ));

      it('exp is required', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.exp = null;
            const output = tokenValidation.validateIdTokenExpiration(decodedIdToken);
            expect(output.errorCode).toBe(ValidationResult.claimRequired('exp').errorCode);
          })
      ));

      it('iat must be a number', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.iat = 'wacamole' as any;
            const output = tokenValidation.validateIdTokenIssuedAt(decodedIdToken);
            expect(output.errorCode).toBe(ValidationResult.claimTypeInvalid('iat', null, null).errorCode);
          })
      ));

      it('iat must be a valid number', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.iat = 0;
            const output = tokenValidation.validateIdTokenIssuedAt(decodedIdToken);
            expect(output.errorCode).toBe(ValidationResult.claimDateInvalid('iat').errorCode);
          })
      ));

      it('iat must be a valid date', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            spyOn(TestBed.get(TokenHelperService), 'convertTokenClaimToDate').and.returnValue(null);
            const output = tokenValidation.validateIdTokenIssuedAt(decodedIdToken);
            expect(output.errorCode).toBe(ValidationResult.claimDateInvalid('iat').errorCode);
          })
      ));

      it('should validate iat with offset', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            decodedIdToken.iat = Date.now() / 1000 - 900;
            {
              const output = tokenValidation.validateIdTokenIssuedAt(decodedIdToken);
              expect(output.errorCode).toBe(ValidationResult.iatValidationFailed().errorCode);
            }
            {
              authConfig.tokenValidation.idTokenIATOffsetAllowed = 1000;

              const output = tokenValidation.validateIdTokenIssuedAt(decodedIdToken);
              expect(output.success).toBeTruthy();
            }
          })
      ));

      it('should validate iat date', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            {
              decodedIdToken.iat = Date.now() / 1000 - 100 * 1000;

              const output = tokenValidation.validateIdTokenIssuedAt(decodedIdToken);
              expect(output.errorCode).toBe(ValidationResult.iatValidationFailed().errorCode);
            }
            {
              decodedIdToken.iat = Date.now() / 1000;

              const output = tokenValidation.validateIdTokenIssuedAt(decodedIdToken);
              expect(output.success).toBeTruthy();
            }
          })
      ));

    });

  describe(`The value of the nonce Claim MUST be checked to verify that it is the same value as the one
  that was sent in the Authentication Request. The Client SHOULD check the nonce value for replay attacks.
    The precise method for detecting replay attacks is Client specific.`, () => {

      it('validates nonce with local copy', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            {
              const local = decodedIdToken.nonce;
              const output = tokenValidation.validateIdTokenNonce(decodedIdToken, local);
              expect(output.success).toBeTruthy();
            }
            {
              const local = 'notthenonce';
              const output = tokenValidation.validateIdTokenNonce(decodedIdToken, local);
              expect(output.errorCode).toBe(ValidationResult.nonceValidationFailed().errorCode);
            }
          })
      ));
    });

  describe(`Access Token Validation
    Hash the octets of the ASCII representation of the access_token with the hash algorithm specified in JWA
    for the alg Header Parameter of the ID Token's JOSE Header.
    Take the left- most half of the hash and base64url- encode it.
    The value of at_hash in the ID Token MUST match the value produced in the previous step if at_hash
    is present in the ID Token`, () => {

      it('at_hash should match hash of access_token', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const accessToken = 'myAccessToken';
            const atHash = 'hash';

            tokenCryptoSpy.sha256b64First128Bits.and.returnValue(atHash);

            const output = tokenValidation.validateIdentityTokenAtHash(accessToken, atHash);
            expect(output.success).toBeTruthy();
          })
      ));

      it('at_hash should not match hash of access_token', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const accessToken = 'myAccessToken';

            const output = tokenValidation.validateIdentityTokenAtHash(accessToken, 'fakehashF');
            expect(output.errorCode).toBe(ValidationResult.atHashValidationFailed().errorCode);
          })
      ));

      it('at_hash can be optional', async(
        inject([TokenValidationService],
          (tokenValidation: TokenValidationService) => {
            const accessToken = 'myAccessToken';

            const output = tokenValidation.validateIdentityTokenAtHash(accessToken, null);
            expect(output.success).toBeTruthy();
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
            const output = tokenValidation.validateIdTokenRequiredFields(decodedIdToken);
            expect(output.errorCode).toBe(ValidationResult.claimRequired(claim).errorCode);
          }
        })
    ));

    it('should return true when all fields present', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const output = tokenValidation.validateIdTokenRequiredFields(decodedIdToken);
          expect(output.success).toBeTruthy();
        })
    ));
  });

  describe('Validation runner', () => {
    const validatorFns: (keyof TokenValidationService)[] = [
      'validateIdTokenFormat',
      'validateIdTokenSignature',
      'validateIdTokenNonce',
      'validateIdTokenRequiredFields',
      'validateIdTokenIssuedAt',
      'validateIdTokenIssuer',
      'validateIdTokenAud',
      'validateIdTokenExpiration',
      'validateIdentityTokenAtHash'];

    it('should run all validation functions', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {

          for (const validationFn of validatorFns) {
            spyOn(tokenValidation, validationFn)
              .and.returnValue(ValidationResult.NoErrors);
          }
          currnetStateSpy.and.returnValue(of({} as any));
          discoveryDocSpy.and.returnValue(of({}));
          jwtKeysSpy.and.returnValue(of({}));
          spyOn(TestBed.get(TokenHelperService), 'getPayloadFromToken').and.returnValue(decodedIdToken);

          const idToken = 'idToken';
          const accessToken = 'accessToken';
          tokenValidation.validateIdToken(idToken, accessToken)
            .subscribe(output => {
              expect(output.success).toBeTruthy();
              for (const validationFn of validatorFns) {
                expect(tokenValidation[validationFn]).toHaveBeenCalled();
              }
            });
        })
    ));

    it('should stop when a validation function fails', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          for (const validationFn of validatorFns.slice(0, validatorFns.length - 3)) {
            spyOn(tokenValidation, validationFn)
              .and.returnValue(ValidationResult.NoErrors);
          }
          spyOn(tokenValidation, validatorFns[validatorFns.length - 3])
            .and.returnValue({ success: false });
          currnetStateSpy.and.returnValue(of({} as any));
          discoveryDocSpy.and.returnValue(of({}));
          jwtKeysSpy.and.returnValue(of({}));

          const idToken = 'idToken';
          const accessToken = 'accessToken';
          tokenValidation.validateIdToken(idToken, accessToken)
            .subscribe(output => {
              expect(output.success).toBeFalsy();
              for (const validationFn of validatorFns.slice(0, validatorFns.length - 3)) {
                expect(tokenValidation[validationFn]).toHaveBeenCalled();
              }
            });
        })
    ));

    it('should fail early if token format is invalid', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const idToken = 'idToken';
          spyOn(tokenValidation, 'validateIdTokenFormat')
            .and.returnValue(ValidationResult.idTokenInvalid(idToken));

          currnetStateSpy.and.returnValue(of({} as any));
          discoveryDocSpy.and.returnValue(of({}));
          jwtKeysSpy.and.returnValue(of({}));

          const accessToken = 'accessToken';
          tokenValidation.validateIdToken(idToken, accessToken)
            .subscribe(output => {
              expect(output.errorCode).toBe(ValidationResult.idTokenInvalid().errorCode);

              expect(currnetStateSpy).not.toHaveBeenCalled();
              expect(discoveryDocSpy).not.toHaveBeenCalled();
              expect(jwtKeysSpy).not.toHaveBeenCalled();

            });
        })
    ));

    it('should fail if a validation function return null', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          for (const validationFn of validatorFns.slice(0, validatorFns.length - 3)) {
            spyOn(tokenValidation, validationFn)
              .and.returnValue(ValidationResult.NoErrors);
          }
          spyOn(tokenValidation, validatorFns[validatorFns.length - 3])
            .and.returnValue(null);
          currnetStateSpy.and.returnValue(of({} as any));
          discoveryDocSpy.and.returnValue(of({}));
          jwtKeysSpy.and.returnValue(of({}));

          const idToken = 'idToken';
          const accessToken = 'accessToken';
          tokenValidation.validateIdToken(idToken, accessToken)
            .subscribe(output => {
              expect(output.success).toBeFalsy();
              for (const validationFn of validatorFns.slice(0, validatorFns.length - 3)) {
                expect(tokenValidation[validationFn]).toHaveBeenCalled();
              }
            });
        })
    ));
  });

  describe('Get numeric claim from token', () => {
    it('claim is required', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const token = {} as any as DecodedIdentityToken;
          const output = tokenValidation.validateTokenNumericClaim(token, 'myclaim');
          expect(output.errorCode).toBe(ValidationResult.claimRequired('myclaim').errorCode);
        })
    ));

    it('claim must be a number', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const token = {
            myclaim: 'wacamole'
          } as any as DecodedIdentityToken;
          const output = tokenValidation.validateTokenNumericClaim(token, 'myclaim');
          expect(output.errorCode).toBe(ValidationResult.claimTypeInvalid('myclaim', null, null).errorCode);
        })
    ));
  });

  describe('Validate Identity Token JWT format', () => {
    it('must be valid', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const token = null;
          const output = tokenValidation.validateIdTokenFormat(token);
          expect(output.errorCode).toBe(ValidationResult.idTokenInvalid().errorCode);
        })
    ));

    it('must be valid string', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const token = '';
          const output = tokenValidation.validateIdTokenFormat(token);
          expect(output.errorCode).toBe(ValidationResult.idTokenInvalid().errorCode);
        })
    ));

    it('must contain three slices separated by dots', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const token = 'token';
          const output = tokenValidation.validateIdTokenFormat(token);
          expect(output.errorCode).toBe(ValidationResult.idTokenInvalidNoDots(null, null).errorCode);
        })
    ));

    it('must contain three slices separated by dots', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const token = 'header.payload';
          const output = tokenValidation.validateIdTokenFormat(token);
          expect(output.errorCode).toBe(ValidationResult.idTokenInvalidNoDots(null, null).errorCode);
        })
    ));

    it('returns true when valid JWT format', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const token = 'header.payload.signature';
          const output = tokenValidation.validateIdTokenFormat(token);
          expect(output.success).toBeTruthy();
        })
    ));
  });

  describe('Validate authorization callback', () => {
    it('returns no error when states matches', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const state = 'a';
          const localState = {
            state: 'a'
          } as LocalState;
          const code = 'abc';
          const output = tokenValidation.validateAuthorizeCallback(localState, state, code);
          expect(output.success).toBeTruthy();
        })
    ));

    it('returns error when states do not match', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const state = 'a';
          const localState = {
            state: 'abc'
          } as LocalState;
          const code = 'abc';
          const output = tokenValidation.validateAuthorizeCallback(localState, state, code);
          expect(output.errorCode).toBe(ValidationResult.stateValidationFailed().errorCode)
        })
    ));

    it('returns error when no code', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const state = 'a';
          const localState = {
            state: 'a'
          } as LocalState;
          const code = null;
          const output = tokenValidation.validateAuthorizeCallback(localState, state, code);
          expect(output.errorCode).toBe(ValidationResult.authorizeCallbackWithoutCode.errorCode)
        })
    ));

    it('returns error when no code', async(
      inject([TokenValidationService],
        (tokenValidation: TokenValidationService) => {
          const state = 'a';
          const localState = {
            state: 'a'
          } as LocalState;
          const code = '';
          const output = tokenValidation.validateAuthorizeCallback(localState, state, code);
          expect(output.errorCode).toBe(ValidationResult.authorizeCallbackWithoutCode.errorCode)
        })
    ));
  });
});
