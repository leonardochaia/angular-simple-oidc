import { SimpleOidcInfoEvent } from 'angular-simple-oidc/events';
import { DiscoveryDocument } from 'angular-simple-oidc/core';

export class DiscoveryDocumentObtainedEvent extends SimpleOidcInfoEvent<DiscoveryDocument> {
    constructor(discoveryDocument: DiscoveryDocument) {
        super(
            `Discovery Document Obtained`,
            discoveryDocument
        );
    }
}
