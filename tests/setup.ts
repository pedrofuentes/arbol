// Provide a proper Map-backed localStorage for tests.
// Node.js v25's native localStorage is broken in jsdom; this replaces it.
const store = new Map<string, string>();

const localStorageImpl: Storage = {
  getItem(key: string): string | null {
    return store.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    store.set(key, String(value));
  },
  removeItem(key: string): void {
    store.delete(key);
  },
  clear(): void {
    store.clear();
  },
  key(index: number): string | null {
    const keys = [...store.keys()];
    return keys[index] ?? null;
  },
  get length(): number {
    return store.size;
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageImpl,
  writable: true,
  configurable: true,
});
