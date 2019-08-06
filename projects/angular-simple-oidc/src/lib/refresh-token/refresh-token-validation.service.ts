import { Injectable } from '@angular/core';
import { DecodedIdentityToken } from '../token/models';
import { RefreshTokenValidationResult } from './refresh-token-validation-result';
import { ValidationResult } from '../token/validation-result';
import { runValidations } from '../token/token-validations-runner';

/**
 * its iss Claim Value MUST be the same as in the ID Token issued when the original authentication occurred,
 * its sub Claim Value MUST be the same as in the ID Token issued when the original authentication occurred,
 * its iat Claim MUST represent the time that the new ID Token is issued,
 * its aud Claim Value MUST be the same as in the ID Token issued when the original authentication occurred,
 * if the ID Token contains an auth_time Claim, its value MUST represent the time
 * of the original authentication - not the time that the new ID token is issued,
 * its azp Claim Value MUST be the same as in the ID Token issued when the original authentication occurred;
 * if no azp Claim was present in the original ID Token, one MUST NOT be present in the new ID Token, and
 * otherwise, the same rules apply as apply when issuing an ID Token at the time of the original authentication.
 */
@Injectable()
export class RefreshTokenValidationService {

    /**
     * Perform validations according to
     * 12.2.  Successful Refresh Response
     * https://openid.net/specs/openid-connect-core-1_0.html#RefreshTokens
     */
    public validateIdToken(originalIdToken: DecodedIdentityToken, newIdToken: DecodedIdentityToken) {
        const validations: (() => ValidationResult)[] = [
            () => this.validateIssuer(originalIdToken, newIdToken),
            () => this.validateSubject(originalIdToken, newIdToken),
            () => this.validateIssuedAt(originalIdToken, newIdToken),
            () => this.validateAudience(originalIdToken, newIdToken),
            () => this.validateAuthTime(originalIdToken, newIdToken),
            () => this.validateAuthorizedParty(originalIdToken, newIdToken),
        ];
        return runValidations(validations);
    }

    /**
     * its iss Claim Value MUST be the same as in the ID Token issued when the original authentication occurred
     */
    public validateIssuer(originalIdToken: DecodedIdentityToken, newIdToken: DecodedIdentityToken) {
        if (originalIdToken.iss === newIdToken.iss) {
            return RefreshTokenValidationResult.noErrors;
        } else {
            return RefreshTokenValidationResult.issValidationFailed(
                `OriginalIdTokenIssuer: ${originalIdToken.iss}
                NewIdTokenIssuer: ${newIdToken.iss}`);
        }
    }

    /**
     * its sub Claim Value MUST be the same as in the ID Token issued when the original authentication occurred,
     */
    public validateSubject(originalIdToken: DecodedIdentityToken, newIdToken: DecodedIdentityToken) {
        if (originalIdToken.sub === newIdToken.sub) {
            return RefreshTokenValidationResult.noErrors;
        } else {
            return RefreshTokenValidationResult.subValidationFailed(
                `OriginalIdTokenSubject: ${originalIdToken.sub}
                NewIdTokenSubject: ${newIdToken.sub}`);
        }
    }

    /**
     * its iat Claim MUST represent the time that the new ID Token is issued,
     */
    public validateIssuedAt(originalIdToken: DecodedIdentityToken, newIdToken: DecodedIdentityToken) {
        if (newIdToken.iat >= originalIdToken.iat) {
            return RefreshTokenValidationResult.noErrors;
        } else {
            return RefreshTokenValidationResult.iatValidationFailed(
                `OriginalIdTokenIissuedAt: ${originalIdToken.iat}
                NewIdTokenIssuedAt: ${newIdToken.iat}`);
        }
    }

    /**
     * its aud Claim Value MUST be the same as in the ID Token issued when the original authentication occurred,
     */
    public validateAudience(originalIdToken: DecodedIdentityToken, newIdToken: DecodedIdentityToken) {
        if (originalIdToken.aud === newIdToken.aud) {
            return RefreshTokenValidationResult.noErrors;
        } else {
            return RefreshTokenValidationResult.audValidationFailed(
                `OriginalIdTokenAudience: ${originalIdToken.aud}
                NewIdTokenAudience: ${newIdToken.aud}`);
        }
    }

    /**
     * if the ID Token contains an auth_time Claim, its value MUST represent
     * the time of the original authentication - not the time that the new ID token is issued,
     */
    public validateAuthTime(originalIdToken: DecodedIdentityToken, newIdToken: DecodedIdentityToken) {
        if (newIdToken.auth_time) {
            return RefreshTokenValidationResult.noErrors;
        }

        if (originalIdToken.auth_time === newIdToken.auth_time) {
            return RefreshTokenValidationResult.noErrors;
        } else {
            return RefreshTokenValidationResult.authTimeValidationFailed(
                `OriginalIdTokenAuthTime: ${originalIdToken.auth_time}
                NewIdTokenAuthTime: ${newIdToken.auth_time}`);
        }
    }

    /**
     * its azp Claim Value MUST be the same as in the ID Token issued when the original authentication occurred;
     * if no azp Claim was present in the original ID Token, one MUST NOT be present in the new ID Token, and
     * otherwise, the same rules apply as apply when issuing an ID Token at the time of the original authentication.
     */
    public validateAuthorizedParty(originalIdToken: DecodedIdentityToken, newIdToken: DecodedIdentityToken) {
        if (originalIdToken.azp === newIdToken.azp) {
            return RefreshTokenValidationResult.noErrors;
        } else {
            return RefreshTokenValidationResult.azpValidationFailed(
                `OriginalIdTokenAuthorizedParty: ${originalIdToken.azp}
                NewIdTokenAuthorizedParty: ${newIdToken.azp}`);
        }
    }
}
