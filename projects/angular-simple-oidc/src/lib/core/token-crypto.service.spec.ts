import { TestBed } from '@angular/core/testing';
import { TokenCryptoService } from './token-crypto.service';

describe('TokenCryptoService', () => {
    let tokenCrypto: TokenCryptoService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                TokenCryptoService
            ],
        });

        tokenCrypto = TestBed.get(TokenCryptoService);
    });

    it('should create', () => {
        expect(tokenCrypto).toBeTruthy();
    });

    it('sha256b64First128Bits should first 128 bits of the hash', () => {
        const expected = 'o3mm9u6vuaVeN4wRgDTidQ';
        const hash = tokenCrypto.sha256b64First128Bits('example.com');
        expect(hash).toEqual(expected);
    });

    it('sha256btoa should return sha256 + base64', () => {
        const expected = 'o3mm9u6vuaVeN4wRgDTidR5oL6ufLTCrE9ISVYbOGUc';
        const hash = tokenCrypto.sha256btoa('example.com');
        expect(hash).toEqual(expected);
    });

    it('should generate a different random nonce each time', () => {
        const first = tokenCrypto.generateNonce();
        const second = tokenCrypto.generateNonce();
        const third = tokenCrypto.generateNonce();

        expect(typeof first).toEqual('string');
        expect(typeof second).toEqual('string');
        expect(typeof third).toEqual('string');

        expect(first).not.toEqual(second);
        expect(second).not.toEqual(third);
        expect(first).not.toEqual(third);
    });

    it('should generate a different random state each time', () => {
        const first = tokenCrypto.generateState();
        const second = tokenCrypto.generateState();
        const third = tokenCrypto.generateState();

        expect(typeof first).toEqual('string');
        expect(typeof second).toEqual('string');
        expect(typeof third).toEqual('string');

        expect(first).not.toEqual(second);
        expect(second).not.toEqual(third);
        expect(first).not.toEqual(third);
    });

    it('should generate proper codes for code verification', () => {
        const codes = tokenCrypto.generateCodesForCodeVerification();
        expect(codes.codeVerifier).toBeDefined();
        expect(typeof codes.codeVerifier).toEqual('string');
        expect(codes.method).toEqual('S256');
    });

});
