/**
 * Loads the catalog from the three published Google Sheet CSVs.
 *
 * Caching, in order:
 *   1. In-memory copy in this worker (60 s) — fastest.
 *   2. Cloudflare edge cache (60 s) — shared by visitors hitting this data centre.
 *   3. Fresh fetch from Google.
 *   4. If Google fails: the last-known-good copy (kept 30 days), marked stale.
 *
 * If none of the SHEET_* variables are set, the sample data from
 * sheet-template/ is used so the site can be previewed before the sheet exists.
 */
import { parseCSVObjects } from "./csv.js";
import { buildCatalog } from "./normalize.js";
import { SAMPLE_CSV } from "./sample.js";

export const FRESH_SECONDS = 60;
const LAST_GOOD_SECONDS = 60 * 60 * 24 * 30;
const FETCH_TIMEOUT_MS = 8000;
const CACHE_VERSION = "v1";

const VARS = {
  products: "SHEET_PRODUCTS_CSV",
  categories: "SHEET_CATEGORIES_CSV",
  settings: "SHEET_SETTINGS_CSV",
};

let memory = null; // { key, result, storedAt }

/** Which source the env points at: "sheet", "sample", or a config error. */
export function sourceOf(env) {
  const set = Object.values(VARS).filter((v) => env[v]);
  if (set.length === 0) return { source: "sample", missing: [] };
  const missing = Object.values(VARS).filter((v) => !env[v]);
  return { source: "sheet", missing };
}

/**
 * Returns { catalog, warnings, stats, source, stale, error? }.
 * Throws only if there is no data at all to show.
 *
 * @param {object} env      Pages env
 * @param {object} ctx      { waitUntil }
 * @param {object} options  { fresh: true } skips the 60 s caches
 */
export async function getCatalog(env, ctx = {}, { fresh = false } = {}) {
  const { source, missing } = sourceOf(env);
  const key = `https://catalog.cache/${CACHE_VERSION}/${source}/${await hash(Object.values(VARS).map((v) => env[v] || "").join("|"))}`;
  const lastGoodKey = `${key}/last-good`;
  const cache = globalThis.caches?.default;
  const now = Date.now();

  if (!fresh) {
    if (memory && memory.key === key && now - memory.storedAt < FRESH_SECONDS * 1000) {
      return memory.result;
    }
    const hit = cache && (await cache.match(key));
    if (hit) {
      const result = await hit.json();
      memory = { key, result, storedAt: Date.parse(result.catalog.generatedAt) || now };
      return result;
    }
  }

  try {
    if (missing.length) {
      throw new Error(`Missing setting(s): ${missing.join(", ")}. Add all three sheet links in Cloudflare.`);
    }
    const texts = source === "sample" ? SAMPLE_CSV : await fetchSheets(env);
    const built = buildCatalog({
      productRows: parseCSVObjects(texts.products),
      categoryRows: parseCSVObjects(texts.categories),
      settingRows: parseCSVObjects(texts.settings),
    });
    if (source === "sample") {
      built.warnings.unshift({
        tab: "Setup",
        row: null,
        message: "Showing SAMPLE products. Add SHEET_PRODUCTS_CSV, SHEET_CATEGORIES_CSV and SHEET_SETTINGS_CSV in Cloudflare to show your sheet.",
      });
    }
    const result = { ...built, source, stale: false };

    memory = { key, result, storedAt: now };
    if (cache) {
      const save = Promise.all([
        cache.put(key, cacheable(result, FRESH_SECONDS)),
        cache.put(lastGoodKey, cacheable(result, LAST_GOOD_SECONDS)),
      ]).catch(() => {});
      ctx.waitUntil ? ctx.waitUntil(save) : await save;
    }
    return result;
  } catch (err) {
    // Google (or the config) failed: fall back to the last good copy.
    let lastGood = memory && memory.key === key ? memory.result : null;
    if (!lastGood && cache) {
      const hit = await cache.match(lastGoodKey);
      if (hit) lastGood = await hit.json();
    }
    if (lastGood) {
      return { ...lastGood, stale: true, error: err.message };
    }
    throw err;
  }
}

async function fetchSheets(env) {
  const entries = await Promise.all(
    Object.entries(VARS).map(async ([name, variable]) => [name, await fetchCsv(env[variable], name)]),
  );
  return Object.fromEntries(entries);
}

async function fetchCsv(url, tab) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, { signal: controller.signal, redirect: "follow", cf: { cacheTtl: 0 } });
  } catch (err) {
    throw new Error(`Couldn't reach the ${tab} sheet (${err.name === "AbortError" ? "timed out" : err.message})`);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`The ${tab} sheet link returned HTTP ${res.status}`);
  const body = await res.text();
  const type = res.headers.get("content-type") || "";
  if (type.includes("text/html") || /^\s*<(!doctype|html)/i.test(body)) {
    throw new Error(`The ${tab} sheet link returned a web page, not CSV. Publish the tab to the web as CSV and copy that link.`);
  }
  return body;
}

function cacheable(result, seconds) {
  return new Response(JSON.stringify(result), {
    headers: { "content-type": "application/json", "cache-control": `public, max-age=${seconds}` },
  });
}

/** Short hash so the cache key changes when the sheet links change. */
async function hash(s) {
  const data = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Find a product by URL slug. Falls back to matching the product code, so
 * links keep working after a product is renamed. */
export function findProduct(products, slug) {
  const s = String(slug || "").toLowerCase();
  const exact = products.find((p) => p.slug === s);
  if (exact) return { product: exact, canonical: true };
  const byId = products.find((p) => {
    const idSlug = slugTail(p);
    return s === idSlug || s.endsWith(`-${idSlug}`);
  });
  return byId ? { product: byId, canonical: false } : { product: null };
}

function slugTail(p) {
  return String(p.id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
