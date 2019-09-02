import { Injectable, Inject } from '@angular/core';
import { DynamicIframe } from './dynamic-iframe';
import { WINDOW_REF } from '../providers';

// @dynamic
@Injectable({
    providedIn: 'root'
})
export class DynamicIframeService {

    protected readonly pending: DynamicIframe[] = [];

    constructor(
        @Inject(WINDOW_REF)
        protected readonly window: Window) { }

    public create() {
        const frame = new DynamicIframe(this.window.document);
        this.pending.push(frame);
        return frame;
    }
}
