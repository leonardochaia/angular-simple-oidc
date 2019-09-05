import { SimpleOidcInfoEvent } from 'angular-simple-oidc/events';
import { TokenRequestResult } from 'angular-simple-oidc/core';
import { ClaimCollection } from './models';

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

export class AccessTokenExpiredEvent extends SimpleOidcInfoEvent<{ token: string, expiredAt: Date, now?: Date }> {
    constructor(payload: { token: string, expiredAt: Date, now?: Date }) {
        super(
            `Access token has expired`,
            payload
        );
    }
}

export class AccessTokenExpiringEvent extends SimpleOidcInfoEvent<{ token: string, expiresAt: Date, now?: Date }> {
    constructor(payload: { token: string, expiresAt: Date, now?: Date }) {
        super(
            `Access token is almost expired`,
            payload
        );
    }
}

export class UserInfoObtainedEvent extends SimpleOidcInfoEvent<ClaimCollection> {
    constructor(payload: ClaimCollection) {
        super(
            `Obtained User Profile`,
            payload
        );
    }
}
