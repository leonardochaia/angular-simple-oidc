import { InjectionToken, Provider } from '@angular/core';

export const AUTH_CONFIG = new InjectionToken('Angular Simple OIDC Auth Config');
export const WINDOW_REF = new InjectionToken('Angular Simple OIDC Window Reference');
export const LOCAL_STORAGE_REF = new InjectionToken('Angular Simple OIDC LocalStorage Reference');

export function localStorageFactory(): Storage {
    return localStorage;
}

export const LOCAL_STORAGE_PROVIDER: Provider = {
    provide: LOCAL_STORAGE_REF,
    useFactory: localStorageFactory
};

export function windowFactory(): Window {
    return window;
}

export const WINDOW_PROVIDER: Provider = {
    provide: WINDOW_REF,
    useFactory: windowFactory
};
