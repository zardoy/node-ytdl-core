import { setTimeout } from 'timers';

/**
 * A cache that expires.
 */
export default class Cache extends Map {
  constructor(public timeout = 1000) {
    super();
  }
  set(key: unknown, value: unknown): any {
    if (this.has(key)) {
      clearTimeout(super.get(key).tid);
    }
    super.set(key, {
      tid: setTimeout(this.delete.bind(this, key), this.timeout).unref(),
      value,
    });
  }
  get(key: unknown): any {
    const entry = super.get(key);
    if (entry) {
      return entry.value;
    }
    return null;
  }
  getOrSet(key: unknown, fn: () => unknown): any {
    if (this.has(key)) {
      return this.get(key);
    } else {
      const value = fn();
      this.set(key, value);
      (async() => {
        try {
          await value;
        } catch (err) {
          this.delete(key);
        }
      })();
      return value;
    }
  }
  delete(key: unknown): boolean {
    const entry = super.get(key);
    if (entry) {
      clearTimeout(entry.tid);
      return super.delete(key);
    } else {
      return false;
    }
  }
  clear(): void {
    for (const entry of this.values()) {
      clearTimeout(entry.tid);
    }
    super.clear();
  }
}
