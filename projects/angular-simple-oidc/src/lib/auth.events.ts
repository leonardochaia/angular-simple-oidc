import { SimpleOidcInfoEvent } from './events/models';
import { TokenRequestResult } from './core/models';

export class TokensObtainedEvent extends SimpleOidcInfoEvent<TokenRequestResult> {
    constructor(tokens: TokenRequestResult) {
        super(
            `Tokens obtained`,
            tokens
        );
    }
}

export class TokensValidatedEvent extends SimpleOidcInfoEvent<TokenRequestResult> {
    constructor(tokens: TokenRequestResult) {
        super(
            `Tokens validated`,
            tokens
        );
    }
}

export class TokensReadyEvent extends SimpleOidcInfoEvent<TokenRequestResult> {
    constructor(tokens: TokenRequestResult) {
        super(
            `Tokens are ready to be used (validated and stored)`,
            tokens
        );
    }
}

export class AccessTokenExpiredEvent extends SimpleOidcInfoEvent {
    constructor(payload: { token: string, expiredAt: Date, now?: Date }) {
        super(
            `Access token has expired`,
            payload
        );
    }
}

export class AccessTokenExpiringEvent extends SimpleOidcInfoEvent {
    constructor(payload: { token: string, expiresAt: Date, now?: Date }) {
        super(
            `Access token is almost expired`,
            payload
        );
    }
}
