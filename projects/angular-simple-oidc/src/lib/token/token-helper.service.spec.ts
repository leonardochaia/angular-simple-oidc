import { TestBed } from '@angular/core/testing';
import { TokenHelperService } from './token-helper.service';

/**
 * Inspired on https://github.com/damienbod/angular-auth-oidc-client
 */
describe('TokenHelperService', () => {
    let tokenHelperService: TokenHelperService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                TokenHelperService
            ],
        });
    });

    beforeEach(() => {
        tokenHelperService = TestBed.get(TokenHelperService);
    });

    it('should create', () => {
        expect(tokenHelperService).toBeTruthy();
    });

    describe('convertTokenClaimToDate', () => {
        it('returns null if null is provided', () => {
            const result = tokenHelperService.convertTokenClaimToDate(null);
            expect(result).toBeNull();
        });

        it('converts the claim to a Date object', () => {
            const result = tokenHelperService.convertTokenClaimToDate(1564270277);
            expect(typeof result).toEqual(typeof new Date());
            expect(result).toEqual(new Date(1564270277000));
        });
    });

    describe('getPayloadFromToken', () => {
        it('returns falsy if token is undefined', () => {
            const result = tokenHelperService.getPayloadFromToken(undefined);
            expect(result).toBeFalsy();
        });

        it('returns falsy if token is null', () => {
            const result = tokenHelperService.getPayloadFromToken(null);
            expect(result).toBeFalsy();
        });

        it('returns falsy if token is empty', () => {
            const result = tokenHelperService.getPayloadFromToken('');
            expect(result).toBeFalsy();
        });

        it('returns falsy if token has no points', () => {
            const result = tokenHelperService.getPayloadFromToken('testStringWithoutDots');
            expect(result).toBeFalsy();
        });

        it('returns falsy if token has no points', () => {
            const result = tokenHelperService.getPayloadFromToken('testStringWithoutDots');
            expect(result).toBeFalsy();
        });

        it('returns falsy if token has only one point', () => {
            const result = tokenHelperService.getPayloadFromToken('testStringWith.dot');
            expect(result).toBeFalsy();
        });

        it('returns payload if token is correct', () => {
            const token = 'abc.eyAidGV4dCIgOiAiSGVsbG8gV29ybGQgMTIzISJ9.ghi';
            const expected = JSON.parse(`{ "text" : "Hello World 123!"}`);
            const result = tokenHelperService.getPayloadFromToken(token);
            expect(expected).toEqual(result);
        });

        it('returns payload if token is correct', () => {
            const token = 'SGVsbG8gV29ybGQgMTIzIQ==.eyAidGV4dCIgOiAiSGVsbG8gV29ybGQgMTIzISJ9.SGVsbG8gV29ybGQgMTIzIQ==';
            const expected = JSON.parse(`{ "text" : "Hello World 123!"}`);
            const result = tokenHelperService.getPayloadFromToken(token);
            expect(expected).toEqual(result);
        });

        it('returns payload if token is correct', () => {
            const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSm9obiBEw7PDqyJ9.wMn-1oLWnxKJolMGb7YKnlwjqusWf4xnnjABgFaDkI4';
            const jsonString = `{ "name" : "John D\xF3\xEB" }`;
            const expected = JSON.parse(jsonString);
            const result = tokenHelperService.getPayloadFromToken(token);
            expect(expected).toEqual(result);
        });

        it('returns payload if token is correct', () => {
            // tslint:disable-next-line:max-line-length
            const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkpvaG4gRF83NDc377-977-9MDEiLCJhZG1pbiI6dHJ1ZSwiaWF0IjoxNTE2MjI0MjQyfQ.RqIi_sO2g592anknIvfks4p7kPy8mOcN0YZUHz-8pFw';
            const jsonString = `{ "admin": true, "sub": "1", "iat": 1516224242 }`;
            const expected = JSON.parse(jsonString);
            const result = tokenHelperService.getPayloadFromToken(token);

            expect(result).toEqual(jasmine.objectContaining(expected));
        });
    });

    describe('getHeaderFromToken', () => {
        it('returns falsy if token is undefined', () => {
            const result = tokenHelperService.getHeaderFromToken(undefined);
            expect(result).toBeFalsy();
        });

        it('returns falsy if token is null', () => {
            const result = tokenHelperService.getHeaderFromToken(null);
            expect(result).toBeFalsy();
        });

        it('returns falsy if token is empty', () => {
            const result = tokenHelperService.getHeaderFromToken('');
            expect(result).toBeFalsy();
        });

        it('returns falsy if token has no points', () => {
            const result = tokenHelperService.getHeaderFromToken('testStringWithoutDots');
            expect(result).toBeFalsy();
        });

        it('returns falsy if token has no points', () => {
            const result = tokenHelperService.getHeaderFromToken('testStringWithoutDots');
            expect(result).toBeFalsy();
        });

        it('returns falsy if token has only one point', () => {
            const result = tokenHelperService.getHeaderFromToken('testStringWith.dot');
            expect(result).toBeFalsy();
        });

        it('returns header if token is correct', () => {
            const token = 'eyAidGV4dCIgOiAiSGVsbG8gV29ybGQgMTIzISJ9.def.ghi';
            const expected = JSON.parse(`{ "text" : "Hello World 123!"}`);
            const result = tokenHelperService.getHeaderFromToken(token);
            expect(expected).toEqual(result);
        });

        it('returns header if token is correct', () => {
            const token = 'eyAidGV4dCIgOiAiSGVsbG8gV29ybGQgMTIzISJ9.SGVsbG8gV29ybGQgMTIzIQ==.SGVsbG8gV29ybGQgMTIzIQ==';
            const expected = JSON.parse(`{ "text" : "Hello World 123!"}`);
            const result = tokenHelperService.getHeaderFromToken(token);
            expect(expected).toEqual(result);
        });
    });

    describe('getSignatureFromToken', () => {
        it('returns falsy if token is undefined', () => {
            const result = tokenHelperService.getSignatureFromToken(undefined);
            expect(result).toBeFalsy();
        });

        it('returns falsy if token is null', () => {
            const result = tokenHelperService.getSignatureFromToken(null);
            expect(result).toBeFalsy();
        });

        it('returns falsy if token is empty', () => {
            const result = tokenHelperService.getSignatureFromToken('');
            expect(result).toBeFalsy();
        });

        it('returns falsy if token has no points', () => {
            const result = tokenHelperService.getSignatureFromToken('testStringWithoutDots');
            expect(result).toBeFalsy();
        });

        it('returns falsy if token has no points', () => {
            const result = tokenHelperService.getSignatureFromToken('testStringWithoutDots');
            expect(result).toBeFalsy();
        });

        it('returns falsy if token has only one point', () => {
            const result = tokenHelperService.getSignatureFromToken('testStringWith.dot');
            expect(result).toBeFalsy();
        });

        it('returns signature if token is correct', () => {
            const token = 'def.ghi.eyAidGV4dCIgOiAiSGVsbG8gV29ybGQgMTIzISJ9';
            const expected = JSON.parse(`{ "text" : "Hello World 123!"}`);
            const result = tokenHelperService.getSignatureFromToken(token);
            expect(expected).toEqual(result);
        });

        it('returns signature if token is correct', () => {
            const token = 'SGVsbG8gV29ybGQgMTIzIQ==.SGVsbG8gV29ybGQgMTIzIQ==.eyAidGV4dCIgOiAiSGVsbG8gV29ybGQgMTIzISJ9';
            const expected = JSON.parse(`{ "text" : "Hello World 123!"}`);
            const result = tokenHelperService.getSignatureFromToken(token);
            expect(expected).toEqual(result);
        });
    });
});
