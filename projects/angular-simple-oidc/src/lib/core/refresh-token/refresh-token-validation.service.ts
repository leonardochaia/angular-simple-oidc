import { Injectable } from '@angular/core';
import { DecodedIdentityToken } from '../models';
import {
    IssuerValidationError,
    SubjectValidationError,
    IssuedAtValidationError,
    AudienceValidationError,
    AuthTimeValidationError,
    AuthorizedPartyValidationError
} from './refresh-token-validation-errors';

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
        this.validateIssuer(originalIdToken, newIdToken);
        this.validateSubject(originalIdToken, newIdToken);
        this.validateIssuedAt(originalIdToken, newIdToken);
        this.validateAudience(originalIdToken, newIdToken);
        this.validateAuthTime(originalIdToken, newIdToken);
        this.validateAuthorizedParty(originalIdToken, newIdToken);
    }

    /**
     * its iss Claim Value MUST be the same as in the ID Token issued when the original authentication occurred
     */
    public validateIssuer(originalIdToken: DecodedIdentityToken, newIdToken: DecodedIdentityToken) {
        if (originalIdToken.iss !== newIdToken.iss) {
            throw new IssuerValidationError(originalIdToken.iss, newIdToken.iss, {
                originalIdToken,
                newIdToken
            });
        }
    }

    /**
     * its sub Claim Value MUST be the same as in the ID Token issued when the original authentication occurred,
     */
    public validateSubject(originalIdToken: DecodedIdentityToken, newIdToken: DecodedIdentityToken) {
        if (originalIdToken.sub !== newIdToken.sub) {
            throw new SubjectValidationError(originalIdToken.sub, newIdToken.sub, {
                originalIdToken,
                newIdToken
            });
        }
    }

    /**
     * its iat Claim MUST represent the time that the new ID Token is issued,
     */
    public validateIssuedAt(originalIdToken: DecodedIdentityToken, newIdToken: DecodedIdentityToken) {
        if (!(newIdToken.iat >= originalIdToken.iat)) {
            throw new IssuedAtValidationError({
                originalIdToken,
                newIdToken
            });
        }
    }

    /**
     * its aud Claim Value MUST be the same as in the ID Token issued when the original authentication occurred,
     */
    public validateAudience(originalIdToken: DecodedIdentityToken, newIdToken: DecodedIdentityToken) {
        if (originalIdToken.aud !== newIdToken.aud) {
            throw new AudienceValidationError({
                originalIdToken,
                newIdToken
            });
        }
    }

    /**
     * if the ID Token contains an auth_time Claim, its value MUST represent
     * the time of the original authentication - not the time that the new ID token is issued,
     */
    public validateAuthTime(originalIdToken: DecodedIdentityToken, newIdToken: DecodedIdentityToken) {
        if (newIdToken.auth_time && (originalIdToken.auth_time !== newIdToken.auth_time)) {
            throw new AuthTimeValidationError({
                originalIdToken,
                newIdToken
            });
        }
    }

    /**
     * its azp Claim Value MUST be the same as in the ID Token issued when the original authentication occurred;
     * if no azp Claim was present in the original ID Token, one MUST NOT be present in the new ID Token, and
     * otherwise, the same rules apply as apply when issuing an ID Token at the time of the original authentication.
     */
    public validateAuthorizedParty(originalIdToken: DecodedIdentityToken, newIdToken: DecodedIdentityToken) {
        if (originalIdToken.azp !== newIdToken.azp) {
            throw new AuthorizedPartyValidationError({
                originalIdToken,
                newIdToken
            });
        }
    }
}
