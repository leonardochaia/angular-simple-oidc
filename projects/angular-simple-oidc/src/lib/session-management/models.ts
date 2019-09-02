export const SESSION_MANAGEMENT_CONFIG_REQUIRED_FIELDS: (keyof SessionManagementConfig)[] = [
    'iframePath'
];

export interface SessionManagementConfig {
    /**
     * Interval in ms at which
     * the OP Iframe will be polled
     */
    opIframePollInterval?: number;

    /**
     * The path to an iframe which posts back the URL to the window
     */
    iframePath?: string;

    /**
     * Max time in ms to wait for the iframe response.
     */
    iframeTimeout?: number;
}
