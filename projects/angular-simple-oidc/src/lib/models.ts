export interface StartCodeFlowParameters extends WindowHandler {
    /**
     * The URL to navigate (using the Router) after
     * the token callback has been execute successfully.
     * (NOTE: This is not the redirect_uri)
     */
    returnUrlAfterCallback?: string;
}

export interface ClaimCollection {
    [key: string]: string | string[];
}

export interface LogoutFlowParameters extends WindowHandler {
    /**
     * The URL to navigate after the session is closed.
     */
    postLogoutRedirectUri?: string;
}

export interface WindowHandler {
    /**
     * Window handler for open the url.
     */
    openWindowHandler?: (url: string) => void;
}
