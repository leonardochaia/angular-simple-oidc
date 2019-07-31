import { Injectable } from '@angular/core';
import { b64utoutf8 } from 'jsrsasign';
import { IdentityTokenHeader, DecodedIdentityToken } from './models';

/**
 * Inspired on https://github.com/damienbod/angular-auth-oidc-client
 */
@Injectable()
export class TokenHelperService {

    public convertTokenClaimToDate(claim: number) {
        if (!claim) {
            return null;
        }

        const date = new Date(0); // The 0 here is the key, which sets the date to the epoch
        date.setUTCSeconds(claim);
        return date;
    }

    public getHeaderFromToken(idToken: string) {
        return this.getTokenSlice(idToken, 0) as IdentityTokenHeader;
    }

    public getPayloadFromToken(idToken: string) {
        return this.getTokenSlice(idToken, 1) as DecodedIdentityToken;
    }

    public getSignatureFromToken(idToken: string) {
        return this.getTokenSlice(idToken, 2) as string;
    }

    protected getTokenSlice(idToken: string, index: number) {
        if (!idToken || idToken.split('.').length != 3) {
            // Quick and dirty validation.
            // The caller is expcetd to validate the token properly
            return null;
        }

        const slice = idToken.split('.')[index];
        const result = b64utoutf8(slice);
        return JSON.parse(result);
    }
}
