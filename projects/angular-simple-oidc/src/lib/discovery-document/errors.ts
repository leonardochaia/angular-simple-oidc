import { SimpleOidcError } from '../core/errors';

export class ObtainDiscoveryDocumentError extends SimpleOidcError {
    constructor(context: any) {
        super(
            'Failed to obtain discovery document',
            'discovery-doc-fetch-failed',
            context
        );
    }
}

export class ObtainJWTKeysError extends SimpleOidcError {
    constructor(context: any) {
        super(
            'Failed to obtain JWT Keys',
            'jwt-keys-fetch-failed',
            context
        );
    }
}

