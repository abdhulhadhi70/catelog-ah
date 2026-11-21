// Loads /api/catalog once per page and keeps it in memory. A copy is kept in
// sessionStorage so moving between the catalog and a product page renders
// instantly, then refreshes quietly in the background.
import { session } from "./store.js";

const KEY = "ah_catalog_v1";
const MAX_AGE_MS = 10 * 60 * 1000;
let inflight = null;

/** The last catalog this tab loaded, if recent. */
export function cachedCatalog() {
  const hit = session.get(KEY);
  if (hit && hit.data && Date.now() - hit.at < MAX_AGE_MS) return hit.data;
  return null;
}

/** Fetch the catalog (shared promise: only one request per page). */
export function fetchCatalog() {
  if (!inflight) {
    inflight = fetch("/api/catalog", { headers: { accept: "application/json" } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!data || !Array.isArray(data.products)) throw new Error("Bad catalog");
        session.set(KEY, { data, at: Date.now() });
        return data;
      })
      .catch((err) => {
        inflight = null; // allow a retry
        throw err;
      });
  }
  return inflight;
}

/** Data the server embedded in the page (product pages), if any. */
export function bootData() {
  try {
    const el = document.getElementById("boot");
    return el ? JSON.parse(el.textContent) : null;
  } catch {
    return null;
  }
}
