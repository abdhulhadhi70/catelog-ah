/**
 * GET /api/health            -> counts + every sheet row problem
 * GET /api/health?fresh=1    -> re-reads the sheet now (and refreshes the site's cache)
 *
 * Shows whether each setting is present, never its value.
 */
import { getCatalog, sourceOf } from "../_lib/catalog.js";
import { json } from "../_lib/http.js";

export async function onRequestGet({ request, env, waitUntil }) {
  const fresh = new URL(request.url).searchParams.has("fresh");
  const { source } = sourceOf(env);
  const config = {
    SHEET_PRODUCTS_CSV: Boolean(env.SHEET_PRODUCTS_CSV),
    SHEET_CATEGORIES_CSV: Boolean(env.SHEET_CATEGORIES_CSV),
    SHEET_SETTINGS_CSV: Boolean(env.SHEET_SETTINGS_CSV),
    CF_ANALYTICS_TOKEN: Boolean(env.CF_ANALYTICS_TOKEN),
  };
  const headers = { "cache-control": "no-store" };

  try {
    const result = await getCatalog(env, { waitUntil }, { fresh });
    const warnings = result.warnings.map((w) => ({
      ...w,
      text: `${w.tab}${w.row ? ` row ${w.row}` : ""}: ${w.message}`,
    }));
    return json(
      {
        ok: !result.stale && warnings.length === 0,
        source,
        stale: result.stale,
        error: result.error || null,
        generatedAt: result.catalog.generatedAt,
        counts: result.stats,
        warnings,
        config,
      },
      { headers },
    );
  } catch (err) {
    return json({ ok: false, source, error: err.message, config }, { status: 503, headers });
  }
}
