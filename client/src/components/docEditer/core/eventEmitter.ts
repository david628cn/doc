export class EventEmitter {
    private callbacks: { [key: string]: Array<Function> } = {};
    public on(event: string, fn: Function): this {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(fn);
        return this;
    }

    public emit(event: string, ...args: any): this {
        const callbacks = this.callbacks[event];
        if (callbacks) {
            callbacks.forEach(callback => callback.apply(this, args));
        }
        return this;
    }

    public off(event: string, fn?: Function): this {
        const callbacks = this.callbacks[event];
        if (callbacks) {
            if (fn) {
                this.callbacks[event] = callbacks.filter(callback => callback !== fn);
            } else {
                delete this.callbacks[event];
            }
        }
        return this;
    }

    public once(event: string, fn: Function): this {
        const onceFn = (...args: any) => {
            this.off(event, onceFn);
            fn.apply(this, args);
        }
        return this.on(event, onceFn);
    }

    public removeAllListeners(): void {
        this.callbacks = {};
    }
}