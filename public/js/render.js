// Pure HTML builders. No DOM access, so the server (functions/index.js) uses
// exactly the same markup as the browser.
import { esc, initials, money } from "./format.js";

// ---------- images ----------

/**
 * An image in a fixed 3:4 box with a shimmer while loading and the product's
 * initials if it fails. `eager` is for the first few images on screen.
 */
export function imageHTML(img, alt, { eager = false, size = "thumb" } = {}) {
  const url = img ? img[size] || img.src : "";
  if (!url) return `<div class="media">${fallbackHTML(alt)}</div>`;
  return `<div class="media is-loading"><img src="${esc(url)}" alt="${esc(alt)}" ${
    eager ? 'fetchpriority="high"' : 'loading="lazy"'
  } decoding="async" width="600" height="800"></div>`;
}

export function fallbackHTML(alt) {
  return `<div class="fallback" aria-hidden="true"><span>${esc(initials(alt))}</span></div>`;
}

// ---------- price + cards ----------

export function priceHTML(p, settings, { large = false } = {}) {
  const sym = settings.currencySymbol;
  const now = `<span class="now">${money(p.finalPrice, sym)}</span>`;
  const sale = p.offerPrice
    ? `<span class="was"><span class="visually-hidden">Was </span>${money(p.price, sym)}</span><span class="off">${p.discountPercent}% off</span>`
    : "";
  return `<div class="price${large ? " price-lg" : ""}">${now}${sale}</div>`;
}

export function cardHTML(p, settings, { eager = false } = {}) {
  return `<a class="card${p.soldOut ? " is-sold-out" : ""}" href="/p/${esc(p.slug)}">
    <div style="position:relative">
      ${imageHTML(p.images[0], p.name, { eager })}
      ${p.offerPrice && !p.soldOut ? `<span class="pill-off">${p.discountPercent}% off</span>` : ""}
      ${p.soldOut ? '<span class="ribbon">Out of stock</span>' : ""}
    </div>
    <div class="card-body">
      <h3 class="card-name">${esc(p.name)}</h3>
      ${priceHTML(p, settings)}
    </div>
  </a>`;
}


// ---------- catalog page pieces ----------

export function chipsHTML(categories, activeCat) {
  return [
    `<button class="chip" type="button" data-cat="" aria-pressed="${!activeCat}">All</button>`,
    ...categories.map(
      (c) =>
        `<button class="chip" type="button" data-cat="${esc(c.slug)}" aria-pressed="${activeCat === c.slug}">${
          c.image ? `<img src="${esc(c.image.thumb)}" alt="" loading="lazy" decoding="async" width="28" height="28">` : ""
        }${esc(c.name)}</button>`,
    ),
  ].join("");
}

export const visibleCategories = (catalog) => catalog.categories.filter((c) => c.count > 0);
export const featuredProducts = (catalog) => catalog.products.filter((p) => p.featured && !p.soldOut);

/** Sort a product list. "featured" = sheet order, featured first, sold out last. */
export function sortProducts(list, sort) {
  const order = (a, b) => a.row - b.row;
  const copy = list.slice();
  if (sort === "newest") return copy.sort((a, b) => -order(a, b)); // bottom of the sheet = newest
  if (sort === "price-asc") return copy.sort((a, b) => a.finalPrice - b.finalPrice || order(a, b));
  if (sort === "price-desc") return copy.sort((a, b) => b.finalPrice - a.finalPrice || order(a, b));
  return copy.sort((a, b) => a.soldOut - b.soldOut || b.featured - a.featured);
}

export const railHTML = (list, settings) => list.map((p, i) => cardHTML(p, settings, { eager: i < 2 })).join("");
export const gridHTML = (list, settings, featuredShown) =>
  list.map((p, i) => cardHTML(p, settings, { eager: !featuredShown && i < 4 })).join("");
export const countText = (n) => `${n} item${n === 1 ? "" : "s"}`;
