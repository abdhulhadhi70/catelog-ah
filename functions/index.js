/**
 * GET / — the catalog page.
 *
 * Fills in the link-preview tags (business name, tagline, first featured
 * photo) and draws the unfiltered page on the server with the same code the
 * browser uses (public/js/render.js), so the page appears complete at once
 * and nothing jumps when the JavaScript starts.
 */
import { getCatalog } from "./_lib/catalog.js";
import { absolute, rewritePage } from "./_lib/page.js";
import { initials } from "../public/js/format.js";
import {
  chipsHTML,
  countText,
  featuredProducts,
  gridHTML,
  railHTML,
  sortProducts,
  visibleCategories,
} from "../public/js/render.js";

// Any of these in the URL means a filtered view: let the browser draw it.
const FILTER_PARAMS = ["cat", "q", "sort", "size", "price", "stock"];

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const shell = await env.ASSETS.fetch(new URL("/", url.origin));

  let catalog = null;
  try {
    catalog = (await getCatalog(env, { waitUntil })).catalog;
  } catch {
    // Still serve the page; it shows a retry button.
  }

  const s = catalog?.settings;
  const name = s?.businessName || "AH Enterprise";
  const cover = catalog?.products.find((p) => p.featured) || catalog?.products[0];

  const res = rewritePage(
    shell,
    {
      title: s?.tagline ? `${name} · ${s.tagline}` : name,
      description: [s?.tagline, s?.locationText, "Browse the collection and order on WhatsApp."].filter(Boolean).join(" · "),
      image: cover ? absolute(cover.images[0]?.src, url.origin) : absolute("/icons/og-default.jpg", url.origin),
      url: `${url.origin}/`,
      siteName: name,
    },
    { analyticsToken: env.CF_ANALYTICS_TOKEN, themeColor: s?.primaryColor, boot: catalog ? { catalog } : null },
  );
  if (!catalog) return res;

  // Header + announcement (always the same, filtered or not).
  let rw = new HTMLRewriter()
    .on("#brand-name", { element: (el) => el.setInnerContent(name) })
    .on("#brand-mark", { element: (el) => el.setInnerContent(initials(name)) })
    .on("#brand-tagline", { element: (el) => el.setInnerContent(s.tagline || s.locationText || "") });
  if (s.announcement) {
    rw = rw.on("#announce", {
      element: (el) => {
        el.removeAttribute("hidden");
        el.setInnerContent(s.announcement);
      },
    });
  }

  const filtered = FILTER_PARAMS.some((k) => url.searchParams.has(k));
  if (!filtered) {
    const featured = featuredProducts(catalog);
    const list = sortProducts(catalog.products, "featured");
    const showFeatured = featured.length > 0;
    rw = rw
      .on("#chips", { element: (el) => el.setInnerContent(chipsHTML(visibleCategories(catalog), ""), { html: true }) })
      .on("#result-count", { element: (el) => el.setInnerContent(countText(list.length)) })
      .on("#grid", {
        element: (el) => {
          el.setAttribute("data-ssr", "");
          el.setAttribute("aria-busy", "false");
          el.setInnerContent(gridHTML(list, s, showFeatured), { html: true });
        },
      });
    if (showFeatured) {
      rw = rw
        .on("#featured", { element: (el) => el.removeAttribute("hidden") })
        .on("#featured-rail", { element: (el) => el.setInnerContent(railHTML(featured, s), { html: true }) });
    }
  }
  return rw.transform(res);
}

