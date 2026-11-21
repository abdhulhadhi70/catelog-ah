/** GET /sitemap.xml — the home page plus every visible product. */
import { getCatalog } from "./_lib/catalog.js";
import { escapeHtml } from "./_lib/http.js";

export async function onRequestGet({ request, env, waitUntil }) {
  const origin = new URL(request.url).origin;
  let products = [];
  let lastmod = new Date().toISOString();
  try {
    const { catalog } = await getCatalog(env, { waitUntil });
    products = catalog.products;
    lastmod = catalog.generatedAt;
  } catch {
    // An empty sitemap is better than an error.
  }
  const urls = [`${origin}/`, ...products.map((p) => `${origin}/p/${p.slug}`)];
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${escapeHtml(u)}</loc><lastmod>${lastmod.slice(0, 10)}</lastmod></url>`).join("\n") +
    `\n</urlset>\n`;
  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
