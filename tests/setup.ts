// Node.js v22+ exposes a native globalThis.localStorage that is incomplete
// when --localstorage-file is not set (e.g., missing clear()). Meanwhile
// jsdom provides a proper Storage class with all methods. Bridge the gap by
// setting the native localStorage's prototype to jsdom's Storage.prototype.
if (typeof Storage !== 'undefined' && typeof localStorage !== 'undefined') {
  Object.setPrototypeOf(localStorage, Storage.prototype);
}
