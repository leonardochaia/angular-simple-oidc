import { Injectable } from '@angular/core';
import { hextob64u, KEYUTIL, KJUR } from 'jsrsasign';
import { JWTKey } from '../discovery-document/models';

@Injectable()
export class TokenCryptoService {

    public sha256b64First128Bits(payload: string) {
        const hash = KJUR.crypto.Util.hashString(payload, 'sha256');
        const first128bits = hash.substr(0, hash.length / 2);
        return hextob64u(first128bits);
    }

    public sha256btoa(payload: string) {
        const hash = KJUR.crypto.Util.hashString(payload, 'sha256');
        return hextob64u(hash);
    }

    public verifySignature(key: JWTKey, message: string): boolean {
        const pk = KEYUTIL.getKey(key);
        return KJUR.jws.JWS.verify(message, pk, ['RS256']);
    }

    public generateNonce() {
        return 'N' + Math.random() + '' + Date.now();
    }

    public generateState() {
        return Date.now() + '' + Math.random() + Math.random();
    }

    public generateCodesForCodeVerification() {
        const codeVerifier = 'C' + Math.random() + '' + Date.now() + '' + Date.now() + Math.random();
        const codeChallenge = this.sha256btoa(codeVerifier);
        const method = 'S256';
        return {
            codeVerifier,
            codeChallenge,
            method
        };
    }
}
