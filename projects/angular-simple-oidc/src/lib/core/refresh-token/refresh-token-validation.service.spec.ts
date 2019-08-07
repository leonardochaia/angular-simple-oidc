import { TestBed } from '@angular/core/testing';
import { RefreshTokenValidationService } from './refresh-token-validation.service';
import { DecodedIdentityToken } from '../models';
import { RefreshTokenValidationResult } from './refresh-token-validation-result';
import { ValidationResult } from '../validation-result';

describe('RefreshTokenValidationService', () => {
    let refreshTokenValidation: RefreshTokenValidationService;
    let originalToken: DecodedIdentityToken;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                RefreshTokenValidationService
            ],
        });

        refreshTokenValidation = TestBed.get(RefreshTokenValidationService);
        originalToken = {
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
    });

    it('should create', () => {
        expect(refreshTokenValidation).toBeTruthy();
    });

    describe('validateIssuer', () => {

        it('should return true when issuers match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
            };
            const output = refreshTokenValidation.validateIssuer(originalToken, newToken);
            expect(output.success).toBeTruthy();
        });

        it('should return error when issuers don\'t match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
                iss: 'nomatch'
            };
            const output = refreshTokenValidation.validateIssuer(originalToken, newToken);
            expect(output.success).toBeFalsy();
            expect(output.errorCode).toBe(RefreshTokenValidationResult.issValidationFailed().errorCode);
        });
    });

    describe('validateSubject', () => {

        it('should return true when subjects match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
            };
            const output = refreshTokenValidation.validateSubject(originalToken, newToken);
            expect(output.success).toBeTruthy();
        });

        it('should return error when subjects don\'t match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
                sub: 'nomatch'
            };
            const output = refreshTokenValidation.validateSubject(originalToken, newToken);
            expect(output.success).toBeFalsy();
            expect(output.errorCode).toBe(RefreshTokenValidationResult.subValidationFailed().errorCode);
        });
    });

    describe('validateIssuedAt', () => {

        it('should return true when iat match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
            };
            const output = refreshTokenValidation.validateIssuedAt(originalToken, newToken);
            expect(output.success).toBeTruthy();
        });

        it('should return error when iat don\'t match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
                iat: 91919191
            };
            const output = refreshTokenValidation.validateIssuedAt(originalToken, newToken);
            expect(output.success).toBeFalsy();
            expect(output.errorCode).toBe(RefreshTokenValidationResult.iatValidationFailed().errorCode);
        });
    });

    describe('validateAudience', () => {

        it('should return true when aud match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
            };
            const output = refreshTokenValidation.validateAudience(originalToken, newToken);
            expect(output.success).toBeTruthy();
        });

        it('should return error when aud don\'t match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
                aud: 'nomatch'
            };
            const output = refreshTokenValidation.validateAudience(originalToken, newToken);
            expect(output.success).toBeFalsy();
            expect(output.errorCode).toBe(RefreshTokenValidationResult.audValidationFailed().errorCode);
        });
    });

    describe('validateAuthTime', () => {

        it('should return true when auth_time match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
            };
            const output = refreshTokenValidation.validateAuthTime(originalToken, newToken);
            expect(output.success).toBeTruthy();
        });

        it('should return true when auth_time is not present', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
                auth_time: null
            };
            const output = refreshTokenValidation.validateAuthTime(originalToken, newToken);
            expect(output.success).toBeTruthy();
        });

        it('should return error when aud don\'t match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
                auth_time: 919191919
            };
            const output = refreshTokenValidation.validateAuthTime(originalToken, newToken);
            expect(output.success).toBeFalsy();
            expect(output.errorCode).toBe(RefreshTokenValidationResult.authTimeValidationFailed().errorCode);
        });
    });

    describe('validateAuthorizedParty', () => {

        it('should return true when azp match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
            };
            const output = refreshTokenValidation.validateAuthorizedParty(originalToken, newToken);
            expect(output.success).toBeTruthy();
        });

        it('should return error when azp don\'t match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
                azp: 'nomatch'
            };
            const output = refreshTokenValidation.validateAuthorizedParty(originalToken, newToken);
            expect(output.success).toBeFalsy();
            expect(output.errorCode).toBe(RefreshTokenValidationResult.azpValidationFailed().errorCode);
        });
    });

    describe('Validation runner', () => {
        const validatorFns: (keyof RefreshTokenValidationService)[] = [
            'validateIssuer',
            'validateSubject',
            'validateIssuedAt',
            'validateAudience',
            'validateAuthTime',
            'validateAuthorizedParty'
        ];

        it('should run all validation functions', () => {

            for (const validationFn of validatorFns) {
                spyOn(refreshTokenValidation, validationFn)
                    .and.returnValue(ValidationResult.noErrors);
            }

            const newToken: DecodedIdentityToken = {
                ...originalToken,
                azp: 'nomatch'
            };
            const output = refreshTokenValidation.validateIdToken(originalToken, newToken);
            expect(output.success).toBeTruthy();
            for (const validationFn of validatorFns) {
                expect(refreshTokenValidation[validationFn]).toHaveBeenCalled();
            }
        });
    });

});
