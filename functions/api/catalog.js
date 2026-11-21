/**
 * GET /api/catalog -> { settings, categories, products, generatedAt, stale }
 * See _lib/catalog.js for caching and the last-known-good fallback.
 */
import { getCatalog, FRESH_SECONDS } from "../_lib/catalog.js";
import { json } from "../_lib/http.js";

export async function onRequestGet({ env, waitUntil }) {
  try {
    const result = await getCatalog(env, { waitUntil });
    return json(
      { ...result.catalog, stale: result.stale },
      { headers: { "cache-control": `public, max-age=${FRESH_SECONDS}` } },
    );
  } catch (err) {
    return json(
      { error: "The catalog couldn't be loaded right now.", detail: err.message },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
