import { Injectable } from '@angular/core';
import { TokenHelperService } from './token-helper.service';
import { take, map } from 'rxjs/operators';
import { Observable, combineLatest, of } from 'rxjs';
import { TokenCryptoService } from './token-crypto.service';
import { AuthConfigService } from '../config/auth-config.service';
import { TokenStorageService } from './token-storage.service';
import { OidcDiscoveryDocClient } from '../discovery-document/oidc-discovery-doc-client.service';
import { ValidationResult } from './validation-result';
import { DecodedIdentityToken, LocalState } from './models';
import { JWTKeys, DiscoveryDocument } from '../discovery-document/models';
import { runValidations } from './token-validations-runner';

/**
 * Implements Identity and Access tokens validations according to the
 * Open ID Connect specification.
 * https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation
 * Inspiration taken from https://github.com/damienbod/angular-auth-oidc-client
 */
@Injectable()
export class TokenValidationService {
    constructor(
        protected readonly tokenHelper: TokenHelperService,
        protected readonly config: AuthConfigService,
        protected readonly tokenCrypto: TokenCryptoService,
    ) { }

    public validateIdToken(
        idToken: string,
        decodedIdToken: DecodedIdentityToken,
        nonce: string,
        discoveryDocument: DiscoveryDocument,
        jwtKeys: JWTKeys) {

        // Apply all validation as defined on
        // https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation
        const validations: (() => ValidationResult)[] = [
            () => this.validateIdTokenSignature(idToken, jwtKeys),
            () => this.validateIdTokenNonce(decodedIdToken, nonce),
            () => this.validateIdTokenRequiredFields(decodedIdToken),
            () => this.validateIdTokenIssuedAt(decodedIdToken),
            () => this.validateIdTokenIssuer(decodedIdToken, discoveryDocument.issuer),
            () => this.validateIdTokenAud(decodedIdToken),
            () => this.validateIdTokenExpiration(decodedIdToken),
        ];

        return runValidations(validations);
    }

    /**
    * The Issuer Identifier for the OpenID Provider (which is typically obtained during Discovery)
    * MUST exactly match the value of the iss (issuer) Claim.
    */
    public validateIdTokenIssuer(dataIdToken: DecodedIdentityToken, discoveryDocumentIssuer: string): ValidationResult {
        if (dataIdToken.iss !== discoveryDocumentIssuer) {
            return ValidationResult.issValidationFailed(`IdentityToken Issuer: ${dataIdToken.iss}
            DiscoveryDocument Issuer: ${discoveryDocumentIssuer}`);
        }

        return ValidationResult.noErrors;
    }

    /**
     * Access Token Validation
     * Hash the octets of the ASCII representation of the access_token with the hash algorithm specified in JWA
     * for the alg Header Parameter of the ID Token's JOSE Header.
     * For instance, if the alg is RS256, the hash algorithm used is SHA-256.
     * Take the left- most half of the hash and base64url- encode it.
     * The value of at_hash in the ID Token MUST match the value produced in the previous step
     * if at_hash is present in the ID Token
    */
    public validateAccessToken(accessToken: string, idTokenAtHash: string): ValidationResult {
        // The at_hash is optional for the code flow
        if (!idTokenAtHash) {
            console.info(`No "at_hash" in Identity Token: Skipping access token validation.`);
            return ValidationResult.noErrors;
        }

        const accessTokenHash = this.tokenCrypto.sha256b64First128Bits(accessToken);
        const valid = idTokenAtHash === accessTokenHash;

        if (valid) {
            return ValidationResult.noErrors;
        } else {
            return ValidationResult.atHashValidationFailed(`at_hash: ${idTokenAtHash}
            Local: ${accessTokenHash}`);
        }
    }

    /**
    * The Client MUST validate that the aud (audience) Claim contains
    * its client_id value registered at the Issuer identified by the iss (issuer) Claim as an audience.
    * The ID Token MUST be rejected if the ID Token does not list the Client as a valid audience,
    * or if it contains additional audiences not trusted by the Client
    */
    public validateIdTokenAud(dataIdToken: DecodedIdentityToken): ValidationResult {
        let aud = dataIdToken.aud;
        if (!Array.isArray(aud)) {
            aud = [aud];
        }

        const valid = aud.includes(this.config.configuration.clientId);
        if (valid) {
            return ValidationResult.noErrors;
        } else {
            return ValidationResult.audValidationFailed(`
            IdentityToken Audience: ${JSON.stringify(dataIdToken.aud)}
            ClientId: ${this.config.configuration.clientId}`);
        }
    }

    /**
     * The Client MUST validate the signature of the ID Token according to JWS using the algorithm
     * specified in the alg Header Parameter of the JOSE Header.
     * The Client MUST use the keys provided by the Issuer.
     * The alg value SHOULD be RS256.
     * Validation of tokens using other signing algorithms is described in the
     * OpenID Connect Core 1.0 specification.
     */
    public validateIdTokenSignature(idToken: string, jwtkeys: JWTKeys): ValidationResult {

        if (!jwtkeys || !jwtkeys.keys || !jwtkeys.keys.length) {
            return ValidationResult.missingJWTKeys;
        }

        const header = this.tokenHelper.getHeaderFromToken(idToken);
        if (!header) {
            return ValidationResult.failedToObtainTokenHeader;
        }

        if (header.alg !== 'RS256') {
            return ValidationResult.onlyRSASupported;
        }

        // Filter keys according to kty and use
        let keysToTry = jwtkeys.keys
            .filter(k => k.kty === 'RSA' && k.use === 'sig');

        if (!keysToTry.length) {
            return ValidationResult.invalidJWTKeys;
        }

        // Token header may have a 'kid' claim (key id)
        // which determines which JWT key should be used for validation
        // If present, must be a case sensitive string.
        // https://tools.ietf.org/html/rfc7515#section-4.1.4
        // https://tools.ietf.org/html/rfc7515#appendix-D

        let kid: string;
        if (header.kid && typeof header.kid === 'string' && header.kid.length) {
            if (keysToTry.some(k => k.kid === header.kid)) {
                // Threat the kid as a hint, prioritizing it's key
                // but still trying the other keys if the desired key fails.
                kid = header.kid;
                keysToTry = keysToTry.sort(k => k.kid === kid ? -1 : 1);
            } else {
                console.info(`Identity token's header contained 'kid'
                but no key with that kid was found on JWT Keys.
                Will still try to validate using other keys, if any.
                kid: ${header.kid},
                ValidKeys kids: ${JSON.stringify(keysToTry.map(k => k.kid))}`);
            }
        }

        // Validate each key breaking as soon as one suceeds
        for (const key of keysToTry) {
            if (this.tokenCrypto.verifySignature(key, idToken)) {
                if (kid && kid !== key.kid) {
                    console.info(`Identity token's header contained 'kid' ${kid}
                    but key signature was validated using key ${key.kid}`);
                }
                return ValidationResult.noErrors;
            }
        }

        return ValidationResult.incorrectSignature;
    }

    /**
     * The current time MUST be before the time represented by the exp Claim
     * (possibly allowing for some small leeway to account for clock skew)
     */
    public validateIdTokenExpiration(idToken: DecodedIdentityToken, offsetSeconds?: number): ValidationResult {

        const numberOutput = this.validateTokenNumericClaim(idToken, 'exp');
        if (!numberOutput.success) {
            return numberOutput;
        }

        const tokenExpirationDate = this.tokenHelper.convertTokenClaimToDate(idToken.exp);
        if (!tokenExpirationDate) {
            return ValidationResult.claimDateInvalid('exp');
        }

        offsetSeconds = offsetSeconds || 0;
        const tokenExpirationValue = tokenExpirationDate.valueOf();
        const nowWithOffset = new Date().valueOf() - offsetSeconds * 1000;
        const tokenNotExpired = tokenExpirationValue > nowWithOffset;
        if (tokenNotExpired) {
            return ValidationResult.noErrors;
        } else {
            return ValidationResult.tokenExpired(`${tokenExpirationDate} (${idToken.exp}
            Max: ${new Date(nowWithOffset)}
            ${tokenExpirationValue} > ${nowWithOffset}`);
        }
    }

    /**
    * The iat Claim can be used to reject tokens that were issued too far away from the current time,
    * limiting the amount of time that nonces need to be stored to prevent attacks.
    * The acceptable range is Client specific.
    */
    public validateIdTokenIssuedAt(idToken: DecodedIdentityToken): ValidationResult {

        if (this.config.configuration.tokenValidation.disableIdTokenIATValidation) {
            return ValidationResult.noErrors;
        }

        const numberOutput = this.validateTokenNumericClaim(idToken, 'iat');
        if (!numberOutput.success) {
            return numberOutput;
        }

        const idTokenIATDate = this.tokenHelper.convertTokenClaimToDate(idToken.iat);
        if (!idTokenIATDate) {
            return ValidationResult.claimDateInvalid('iat');
        }

        const maxIATOffsetAllowed = this.config.configuration.tokenValidation.idTokenIATOffsetAllowed || 5;
        const valid = new Date().valueOf() - idTokenIATDate.valueOf() < maxIATOffsetAllowed * 1000;
        if (valid) {
            return ValidationResult.noErrors;
        } else {
            return ValidationResult.iatValidationFailed(`iat < offset:
            ${new Date().valueOf() - idTokenIATDate.valueOf()} < ${maxIATOffsetAllowed * 1000}`);
        }
    }

    /**
    * The value of the nonce Claim MUST be checked to verify that it is the same value as the one
    * that was sent in the Authentication Request.
    * The Client SHOULD check the nonce value for replay attacks.
    * The precise method for detecting replay attacks is Client specific.
    */
    public validateIdTokenNonce(idToken: DecodedIdentityToken, localNonce: any): ValidationResult {
        if (idToken.nonce !== localNonce) {
            return ValidationResult.nonceValidationFailed(`LocalNonce: ${localNonce}
            ReturnedNonce: ${idToken.nonce}`);
        }

        return ValidationResult.noErrors;
    }

    /**
    * iss
    * REQUIRED. Issuer Identifier for the Issuer of the response.
    * The iss value is a case-sensitive URL using the https scheme that contains scheme, host,
    * and optionally, port number and path components and no query or fragment components.
    *
    * sub
    * REQUIRED. Subject Identifier.Locally unique and never reassigned identifier within the Issuer for the End- User,
    * which is intended to be consumed by the Client, e.g., 24400320 or AItOawmwtWwcT0k51BayewNvutrJUqsvl6qs7A4.
    * It MUST NOT exceed 255 ASCII characters in length.The sub value is a case-sensitive string.
    *
    * aud
    * REQUIRED. Audience(s) that this ID Token is intended for.
    * It MUST contain the OAuth 2.0 client_id of the Relying Party as an audience value.
    * It MAY also contain identifiers for other audiences.In the general case, the aud value is an array of case-sensitive strings.
    * In the common special case when there is one audience, the aud value MAY be a single case-sensitive string.
    *
    * exp
    * REQUIRED. Expiration time on or after which the ID Token MUST NOT be accepted for processing.
    * The processing of this parameter requires that the current date/ time MUST be before
    * the expiration date/ time listed in the value.
    * Implementers MAY provide for some small leeway, usually no more than a few minutes, to account for clock skew.
    * Its value is a JSON [RFC7159] number representing the number of seconds from 1970- 01 - 01T00: 00:00Z
    * as measured in UTC until the date/ time.
    * See RFC 3339 [RFC3339] for details regarding date/ times in general and UTC in particular.
    *
    * iat
    * REQUIRED. Time at which the JWT was issued. Its value is a JSON number representing the number of seconds
    * from 1970- 01 - 01T00: 00:00Z as measured
    * in UTC until the date/ time.
    */
    public validateIdTokenRequiredFields(dataIdToken: DecodedIdentityToken): ValidationResult {
        const requiredClaims = ['iss', 'sub', 'aud', 'exp', 'iat'];
        for (const key of requiredClaims) {
            if (!dataIdToken.hasOwnProperty(key)) {
                return ValidationResult.claimRequired(key);
            }
        }
        return ValidationResult.noErrors;
    }

    /**
     * Validates that an expected token numeric field is a number on runtime.
     */
    public validateTokenNumericClaim<T extends DecodedIdentityToken>(idToken: T, claim: keyof T) {
        if (typeof idToken[claim] !== 'number') {
            if (!idToken[claim]) {
                return ValidationResult.claimRequired(claim.toString());
            } else {
                return ValidationResult.claimTypeInvalid(claim.toString(), 'number', typeof (idToken[claim]));
            }
        }

        return ValidationResult.noErrors;
    }

    /**
     * Makes sure that the format of the identity token is correct.
     * It needs to be a non-empty string and contain three dots
     */
    public validateIdTokenFormat(idToken: string) {
        if (!idToken || !idToken.length) {
            return ValidationResult.idTokenInvalid(idToken);
        }

        const expectedSliceAmount = 3;
        const slices = idToken.split('.');

        if (slices.length !== expectedSliceAmount) {
            return ValidationResult.idTokenInvalidNoDots(idToken, expectedSliceAmount);
        }

        return ValidationResult.noErrors;
    }

    /**
     * Validates the local state against the
     * returned state from the IDP to make sure it matches
     */
    public validateAuthorizeCallback(localState: LocalState, state: string, code: string) {
        if (state !== localState.state) {
            return ValidationResult.stateValidationFailed(`LocalState: ${localState.state}
            ReturnedState: ${state}`);
        }

        if (!code || !code.length) {
            return ValidationResult.authorizeCallbackWithoutCode;
        }

        return ValidationResult.noErrors;
    }
}
