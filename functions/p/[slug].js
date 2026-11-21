/**
 * GET /p/<slug> — the product page, with the product's name, price and photo
 * in the link-preview tags. Old links still work after a product is renamed:
 * they are matched by product code and redirected to the current address.
 */
import { getCatalog, findProduct } from "../_lib/catalog.js";
import { absolute, formatINR, rewritePage } from "../_lib/page.js";

export async function onRequestGet({ request, env, params, waitUntil }) {
  const url = new URL(request.url);
  const shell = await env.ASSETS.fetch(new URL("/product", url.origin));

  let result;
  try {
    result = await getCatalog(env, { waitUntil });
  } catch {
    return shell; // the page shows its own "couldn't load" state
  }

  const { settings, products } = result.catalog;
  const { product, canonical } = findProduct(products, params.slug);

  if (!product) {
    return rewritePage(
      shell,
      {
        title: `Product not found · ${settings.businessName}`,
        description: settings.tagline || `Browse the ${settings.businessName} catalog.`,
        url: url.origin + url.pathname,
        siteName: settings.businessName,
        robots: "noindex",
        status: 404,
      },
      { analyticsToken: env.CF_ANALYTICS_TOKEN, themeColor: settings.primaryColor },
    );
  }

  if (!canonical) {
    return Response.redirect(`${url.origin}/p/${product.slug}${url.search}`, 301);
  }

  const price = formatINR(product.finalPrice, settings.currencySymbol);
  const offer = product.offerPrice ? ` (${product.discountPercent}% off)` : "";
  const bits = [product.fabric, product.sizes.length ? `Sizes: ${product.sizes.join(", ")}` : ""].filter(Boolean);
  return rewritePage(
    shell,
    {
      title: `${product.name} · ${price} · ${settings.businessName}`,
      description: `${price}${offer} · Code ${product.id}. ${bits.join(" · ")}. Order on WhatsApp.`.replace(/\.\s*\./g, "."),
      image: absolute(product.images[0]?.src, url.origin),
      url: `${url.origin}/p/${product.slug}`,
      type: "product",
      siteName: settings.businessName,
    },
    {
      boot: { product, settings, category: result.catalog.categories.find((c) => c.slug === product.category) || null },
      analyticsToken: env.CF_ANALYTICS_TOKEN,
      themeColor: settings.primaryColor,
    },
  );
}
