export interface StartCodeFlowParameters {
    /**
     * The URL to navigate (using the Router) after
     * the token callback has been execute successfully.
     * (NOTE: This is not the redirect_uri)
     */
    returnUrlAfterCallback?: string;
}
