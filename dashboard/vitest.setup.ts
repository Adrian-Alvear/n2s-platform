// Node 26 defines a global `localStorage` that is unavailable unless the process
// was started with `--localstorage-file`, and it shadows anything jsdom would
// otherwise provide — so under the jsdom environment the bare `localStorage`
// our stores use is `undefined`. Install a spec-shaped in-memory Storage in its
// place. Each test file gets its own environment, so state never leaks between
// files. (Property access like `localStorage.foo` is not emulated; the code
// under test only ever uses the getItem/setItem/removeItem methods.)

class MemoryStorage implements Storage {
  [name: string]: unknown;
  #entries = new Map<string, string>();

  get length(): number {
    return this.#entries.size;
  }

  key(index: number): string | null {
    return [...this.#entries.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.#entries.has(String(key)) ? this.#entries.get(String(key))! : null;
  }

  setItem(key: string, value: string): void {
    this.#entries.set(String(key), String(value));
  }

  removeItem(key: string): void {
    this.#entries.delete(String(key));
  }

  clear(): void {
    this.#entries.clear();
  }
}

if (typeof window !== "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}
