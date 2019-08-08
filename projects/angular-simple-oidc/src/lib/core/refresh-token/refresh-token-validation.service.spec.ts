import { TestBed } from '@angular/core/testing';
import { RefreshTokenValidationService } from './refresh-token-validation.service';
import { DecodedIdentityToken } from '../models';
import {
    IssuerValidationError,
    SubjectValidationError,
    IssuedAtValidationError,
    AudienceValidationError,
    AuthTimeValidationError,
    AuthorizedPartyValidationError
} from './refresh-token-validation-errors';

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
            expect(() => refreshTokenValidation.validateIssuer(originalToken, newToken))
                .not.toThrow();
        });

        it('should throw error when issuers don\'t match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
                iss: 'nomatch'
            };
            expect(() => refreshTokenValidation.validateIssuer(originalToken, newToken))
                .toThrow(new IssuerValidationError(originalToken.iss, newToken.iss, null));
        });
    });

    describe('validateSubject', () => {

        it('should return true when subjects match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
            };
            expect(() => refreshTokenValidation.validateSubject(originalToken, newToken))
                .not.toThrow();
        });

        it('should return error when subjects don\'t match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
                sub: 'nomatch'
            };
            expect(() => refreshTokenValidation.validateSubject(originalToken, newToken))
                .toThrow(new SubjectValidationError(originalToken.sub, newToken.sub, null));
        });
    });

    describe('validateIssuedAt', () => {

        it('should return true when iat match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
            };
            expect(() => refreshTokenValidation.validateIssuedAt(originalToken, newToken))
                .not.toThrow();
        });

        it('should return error when iat don\'t match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
                iat: originalToken.iat - 10000
            };
            expect(() => refreshTokenValidation.validateIssuedAt(originalToken, newToken))
                .toThrow(new IssuedAtValidationError(null));
        });
    });

    describe('validateAudience', () => {

        it('should return true when aud match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
            };

            expect(() => refreshTokenValidation.validateAudience(originalToken, newToken))
                .not.toThrow();
        });

        it('should return error when aud don\'t match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
                aud: 'nomatch'
            };

            expect(() => refreshTokenValidation.validateAudience(originalToken, newToken))
                .toThrow(new AudienceValidationError(null));
        });
    });

    describe('validateAuthTime', () => {

        it('should not throw when auth_time match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
            };
            expect(() => refreshTokenValidation.validateAuthTime(originalToken, newToken))
                .not.toThrow();
        });

        it('should not throw when auth_time is not present', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
                auth_time: null
            };

            expect(() => refreshTokenValidation.validateAuthTime(originalToken, newToken))
                .not.toThrow();
        });

        it('should return error when aud don\'t match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
                auth_time: 919191919
            };

            expect(() => refreshTokenValidation.validateAuthTime(originalToken, newToken))
                .toThrow(new AuthTimeValidationError(null));
        });
    });

    describe('validateAuthorizedParty', () => {

        it('should return true when azp match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
            };
            expect(() => refreshTokenValidation.validateAuthorizedParty(originalToken, newToken))
                .not.toThrow();
        });

        it('should return error when azp don\'t match', () => {
            const newToken: DecodedIdentityToken = {
                ...originalToken,
                azp: 'nomatch'
            };

            expect(() => refreshTokenValidation.validateAuthorizedParty(originalToken, newToken))
                .toThrow(new AuthorizedPartyValidationError(null));
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
                    .and.returnValue();
            }

            const newToken: DecodedIdentityToken = {
                ...originalToken,
            };

            expect(() => refreshTokenValidation.validateIdToken(originalToken, newToken))
                .not.toThrow();

            for (const validationFn of validatorFns) {
                expect(refreshTokenValidation[validationFn]).toHaveBeenCalled();
            }
        });
    });

});
