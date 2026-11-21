/**
 * Cloudflare Worker entry point.
 *
 * Static files in public/ are served directly by Cloudflare. Only the routes
 * listed under `run_worker_first` in wrangler.toml reach this file, which
 * hands each one to its handler in functions/.
 */
import * as home from "../functions/index.js";
import * as product from "../functions/p/[slug].js";
import * as catalog from "../functions/api/catalog.js";
import * as health from "../functions/api/health.js";
import * as sitemap from "../functions/sitemap.xml.js";
import * as robots from "../functions/robots.txt.js";

const ROUTES = [
  [/^\/$/, home],
  [/^\/p\/([^/]+)\/?$/, product, "slug"],
  [/^\/api\/catalog\/?$/, catalog],
  [/^\/api\/health\/?$/, health],
  [/^\/sitemap\.xml$/, sitemap],
  [/^\/robots\.txt$/, robots],
];

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    for (const [pattern, mod, param] of ROUTES) {
      const match = pathname.match(pattern);
      if (!match) continue;
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
      }
      const params = param ? { [param]: decodeURIComponent(match[1]) } : {};
      return mod.onRequestGet({ request, env, params, waitUntil: (p) => ctx.waitUntil(p) });
    }
    return env.ASSETS.fetch(request);
  },
};
