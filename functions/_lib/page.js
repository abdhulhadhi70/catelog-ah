/**
 * Helpers for the two HTML pages: fills in <title>, description and Open
 * Graph tags (so links pasted into WhatsApp / Facebook show a rich preview),
 * embeds data for an instant first render, and adds Cloudflare Web Analytics
 * when CF_ANALYTICS_TOKEN is set.
 */
import { escapeHtml, scriptJson } from "./http.js";

export function absolute(url, origin) {
  if (!url) return "";
  try {
    return new URL(url, origin).toString();
  } catch {
    return "";
  }
}

export function formatINR(n, symbol = "₹") {
  return `${symbol}${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/**
 * @param {Response} res   the static HTML from env.ASSETS
 * @param {object} meta    { title, description, image, url, type, robots }
 * @param {object} extra   { boot, analyticsToken, themeColor }
 */
export function rewritePage(res, meta, { boot, analyticsToken, themeColor } = {}) {
  const set = (selector, value) => [selector, { element: (el) => el.setAttribute("content", value) }];
  const handlers = [
    ["title", { element: (el) => el.setInnerContent(meta.title) }],
    set('meta[name="description"]', meta.description),
    set('meta[property="og:title"]', meta.title),
    set('meta[property="og:description"]', meta.description),
    set('meta[property="og:url"]', meta.url),
    set('meta[property="og:type"]', meta.type || "website"),
    set('meta[property="og:site_name"]', meta.siteName || ""),
    set('meta[name="twitter:title"]', meta.title),
    set('meta[name="twitter:description"]', meta.description),
    ['link[rel="canonical"]', { element: (el) => el.setAttribute("href", meta.url) }],
  ];
  if (meta.image) {
    handlers.push(set('meta[property="og:image"]', meta.image), set('meta[name="twitter:image"]', meta.image));
  }
  if (themeColor) handlers.push(set('meta[name="theme-color"]', themeColor));

  let rewriter = new HTMLRewriter();
  for (const [selector, handler] of handlers) rewriter = rewriter.on(selector, handler);

  rewriter = rewriter.on("head", {
    element(el) {
      if (meta.robots) el.append(`<meta name="robots" content="${escapeHtml(meta.robots)}">`, { html: true });
      if (themeColor) el.append(`<style>:root{--accent:${escapeHtml(themeColor)}}</style>`, { html: true });
      if (boot) el.append(`<script id="boot" type="application/json">${scriptJson(boot)}</script>`, { html: true });
    },
  });
  if (analyticsToken) {
    rewriter = rewriter.on("body", {
      element(el) {
        el.append(
          `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${escapeHtml(JSON.stringify({ token: analyticsToken }))}'></script>`,
          { html: true },
        );
      },
    });
  }

  const out = rewriter.transform(res);
  const headers = new Headers(out.headers);
  headers.set("cache-control", "public, max-age=60");
  return new Response(out.body, { status: meta.status || res.status, headers });
}
