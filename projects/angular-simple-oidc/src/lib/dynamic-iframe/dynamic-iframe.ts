
export class DynamicIframe {

    public readonly handle: HTMLIFrameElement;

    constructor(protected readonly document: Document) {
        this.handle = this.document.createElement('iframe');
    }

    public appendTo(e: HTMLElement) {
        e.appendChild(this.handle);
        return this;
    }

    public appendToBody() {
        this.appendTo(this.document.body);
        return this;
    }

    public setSource(url: string) {
        this.handle.src = url;
        return this;
    }

    public hide() {
        this.handle.style.display = 'none';
        return this;
    }

    public postMessage(msg: string, origin: string) {
        this.handle.contentWindow.postMessage(msg, origin);
        return this;
    }

    public remove() {
        // iframe may not have been appended.
        if (this.handle.parentElement) {
            this.handle.parentElement.removeChild(this.handle);
        }
        return this;
    }
}
