// localStorage / sessionStorage that never throws (private mode, blocked
// storage and some in-app browsers can make every access throw).

function wrap(getStore) {
  return {
    get(key, fallback = null) {
      try {
        const raw = getStore().getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        getStore().setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        getStore().removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

export const local = wrap(() => window.localStorage);
export const session = wrap(() => window.sessionStorage);
