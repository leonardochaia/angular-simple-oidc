export const POPUP_AUTHORIZATION_CONFIG_REQUIRED_FIELDS: (keyof PopupAuthorizationConfig)[] = [
    'childWindowPath'
];

export interface PopupAuthorizationConfig {
    /**
     * The path to an HTML file which posts back the URL to the window
     * This can be the same file used for SessionManagement
     */
    childWindowPath?: string;
}
