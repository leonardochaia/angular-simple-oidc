import { Injectable } from '@angular/core';
import { TokenHelperService } from './token-helper.service';
import { TokenCryptoService } from './token-crypto.service';
import { DecodedIdentityToken, TokenValidationConfig } from './models';
import { JWTKeys, DiscoveryDocument } from './models';
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
        protected readonly tokenCrypto: TokenCryptoService,
    ) { }

    public validateIdToken(
        thisClientId: string,
        idToken: string,
        decodedIdToken: DecodedIdentityToken,
        nonce: string,
        discoveryDocument: DiscoveryDocument,
        jwtKeys: JWTKeys,
        tokenValidationConfig?: TokenValidationConfig) {

        // Apply all validation as defined on
        // https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation

        this.validateIdTokenSignature(idToken, jwtKeys);
        this.validateIdTokenNonce(decodedIdToken, nonce);
        this.validateIdTokenRequiredFields(decodedIdToken);
        this.validateIdTokenIssuedAt(decodedIdToken, tokenValidationConfig);
        this.validateIdTokenIssuer(decodedIdToken, discoveryDocument.issuer);
        this.validateIdTokenAud(decodedIdToken, thisClientId);
        this.validateIdTokenExpiration(decodedIdToken);
    }

    /**
    * The Issuer Identifier for the OpenID Provider (which is typically obtained during Discovery)
    * MUST exactly match the value of the iss (issuer) Claim.
    */
    public validateIdTokenIssuer(idToken: DecodedIdentityToken, discoveryDocumentIssuer: string) {
        if (idToken.iss !== discoveryDocumentIssuer) {
            throw new IssuerValidationFailedError(idToken.iss, discoveryDocumentIssuer, {
                idToken,
                discoveryDocumentIssuer
            });
        }
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
    public validateAccessToken(accessToken: string, idTokenAtHash: string) {
        // The at_hash is optional for the code flow
        if (!idTokenAtHash) {
            console.info(`No "at_hash" in Identity Token: Skipping access token validation.`);
            return;
        }

        const accessTokenHash = this.tokenCrypto.sha256b64First128Bits(accessToken);
        if (idTokenAtHash !== accessTokenHash) {
            throw new AccessTokenHashValidationFailedError({
                accessToken,
                idTokenAtHash,
                calculatedHash: accessTokenHash
            });
        }
    }

    /**
    * The Client MUST validate that the aud (audience) Claim contains
    * its client_id value registered at the Issuer identified by the iss (issuer) Claim as an audience.
    * The ID Token MUST be rejected if the ID Token does not list the Client as a valid audience,
    * or if it contains additional audiences not trusted by the Client
    */
    public validateIdTokenAud(idToken: DecodedIdentityToken, thisClientId: string) {
        let aud = idToken.aud;
        if (!Array.isArray(aud)) {
            aud = [aud];
        }

        const valid = aud.includes(thisClientId);
        if (!valid) {
            throw new AudienceValidationFailedError(aud.join(','), thisClientId, {
                idToken,
                thisClientId,
                aud
            });
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
    public validateIdTokenSignature(idToken: string, jwtKeys: JWTKeys) {

        if (!jwtKeys || !jwtKeys.keys || !jwtKeys.keys.length) {
            throw new JWTKeysMissingError({
                idToken,
                jwtKeys
            });
        }

        const header = this.tokenHelper.getHeaderFromToken(idToken);

        if (header.alg !== 'RS256') {
            throw new SignatureAlgorithmNotSupportedError({
                idToken,
                jwtKeys,
                header,
            });
        }

        // Filter keys according to kty and use
        let keysToTry = jwtKeys.keys
            .filter(k => k.kty === 'RSA' && k.use === 'sig');

        if (!keysToTry.length) {
            throw new JWTKeysInvalidError({
                idToken,
                jwtKeys,
                header,
                keysToTry
            });
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

        // Validate each key returning as soon as one suceeds
        for (const key of keysToTry) {
            if (this.tokenCrypto.verifySignature(key, idToken)) {
                if (kid && kid !== key.kid) {
                    console.info(`Identity token's header contained 'kid' ${kid}
                    but key signature was validated using key ${key.kid}`);
                }
                return;
            }
        }

        throw new InvalidSignatureError({
            idToken,
            jwtKeys,
            header,
            keysToTry,
            kid
        });
    }

    /**
     * The current time MUST be before the time represented by the exp Claim
     * (possibly allowing for some small leeway to account for clock skew)
     */
    public validateIdTokenExpiration(idToken: DecodedIdentityToken, offsetSeconds?: number) {

        this.validateTokenNumericClaim(idToken, 'exp');

        const tokenExpirationDate = this.tokenHelper.convertTokenClaimToDate(idToken.exp);
        if (!tokenExpirationDate) {
            throw new DateClaimInvalidError('exp', {
                idToken,
                offsetSeconds,
                parsedDate: tokenExpirationDate
            });
        }

        offsetSeconds = offsetSeconds || 0;
        const tokenExpirationMs = tokenExpirationDate.valueOf();
        const maxDateMs = new Date().valueOf() - offsetSeconds * 1000;
        const tokenNotExpired = tokenExpirationMs > maxDateMs;
        if (!tokenNotExpired) {
            throw new TokenExpiredError(tokenExpirationDate, {
                idToken,
                offsetSeconds,
                tokenExpirationDate,
                tokenExpirationMs,
                maxDateMs,
                maxDate: new Date(maxDateMs)
            });
        }
    }

    /**
    * The iat Claim can be used to reject tokens that were issued too far away from the current time,
    * limiting the amount of time that nonces need to be stored to prevent attacks.
    * The acceptable range is Client specific.
    */
    public validateIdTokenIssuedAt(idToken: DecodedIdentityToken, config: TokenValidationConfig = {}) {

        if (config.disableIdTokenIATValidation) {
            console.info('Issued At validation has been disabled by configuration');
            return;
        }

        this.validateTokenNumericClaim(idToken, 'iat');

        const idTokenIATDate = this.tokenHelper.convertTokenClaimToDate(idToken.iat);
        if (!idTokenIATDate) {
            throw new DateClaimInvalidError('iat', {
                idToken,
                config,
                parsedDate: idTokenIATDate
            });
        }

        const maxOffsetInMs = (config.idTokenIATOffsetAllowed || 5) * 1000;
        const now = new Date().valueOf();
        const valid = (now - idTokenIATDate.valueOf()) < maxOffsetInMs;
        if (!valid) {
            throw new IssuedAtValidationFailedError(maxOffsetInMs / 1000, {
                idToken,
                config,
                iatDiff: now - idTokenIATDate.valueOf(),
                maxOffsetInMs,
            });
        }
    }

    /**
    * The value of the nonce Claim MUST be checked to verify that it is the same value as the one
    * that was sent in the Authentication Request.
    * The Client SHOULD check the nonce value for replay attacks.
    * The precise method for detecting replay attacks is Client specific.
    */
    public validateIdTokenNonce(idToken: DecodedIdentityToken, localNonce: string) {
        if (idToken.nonce !== localNonce) {
            throw new InvalidNonceError({
                localNonce,
                idTokenNonce: idToken.nonce,
                idToken
            });
        }
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
    public validateIdTokenRequiredFields(idToken: DecodedIdentityToken) {
        const requiredClaims = ['iss', 'sub', 'aud', 'exp', 'iat'];
        for (const key of requiredClaims) {
            if (!idToken.hasOwnProperty(key)) {
                throw new ClaimRequiredError(key, {
                    idToken,
                    requiredClaims,
                    missingClaim: key
                });
            }
        }
    }

    /**
     * Validates that an expected token numeric field is a number on runtime.
     */
    public validateTokenNumericClaim<T extends DecodedIdentityToken>(idToken: T, claim: keyof T) {
        if (typeof idToken[claim] !== 'number') {
            if (!idToken[claim]) {
                throw new ClaimRequiredError(claim.toString(), {
                    idToken,
                    requiredClaim: claim
                });
            } else {
                throw new ClaimTypeInvalidError(claim.toString(), 'number', typeof (idToken[claim]), {
                    idToken,
                    claim,
                    claimType: typeof (idToken[claim]),
                    claimExpectedType: 'number'
                });
            }
        }
    }

    /**
     * Makes sure that the format of the identity token is correct.
     * It needs to be a non-empty string and contain three dots
     */
    public validateIdTokenFormat(idToken: string) {
        if (!idToken || !idToken.length) {
            throw new RequiredParemetersMissingError('idToken', null);
        }

        const expectedSliceAmount = 3;
        const slices = idToken.split('.');

        if (slices.length !== expectedSliceAmount) {
            throw new IdentityTokenMalformedError({
                idToken
            });
        }
    }

    /**
     * Validates the local state against the
     * returned state from the IDP to make sure it matches
     */
    public validateAuthorizeCallbackState(localState: string, state: string) {
        if (state !== localState) {
            throw new InvalidStateError({
                localState,
                returnedState: state,
            });
        }
    }

    public validateAuthorizeCallbackFormat(
        code: string,
        state: string,
        error: string,
        href: string) {

        if (typeof error === 'string') {
            throw new AuthorizationCallbackError(error, {
                url: href,
                error,
            });
        }

        if (typeof code !== 'string') {
            throw new AuthorizationCallbackMissingParameterError('code', {
                url: href,
            });
        }

        if (typeof state !== 'string') {
            throw new AuthorizationCallbackMissingParameterError('state', {
                url: href,
            });
        }
    }
}
