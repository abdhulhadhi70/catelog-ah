/**
 * Turns raw sheet rows into clean settings, categories and products, and
 * collects warnings (sheet row number + reason) for /api/health.
 *
 * Nothing here throws on bad data: a bad row is skipped with a warning so one
 * typo in the sheet never takes the whole catalog down.
 */
import { splitImageCell, toImage } from "./drive.js";

// ---------- small value helpers ----------

export const text = (v) => String(v ?? "").trim();

/** "Yes", "yes", "Y", "TRUE", "1" -> true. Anything else -> false. */
export function yes(v) {
  return ["yes", "y", "true", "1"].includes(text(v).toLowerCase());
}

/** "₹1,299", "Rs. 1299", " 1299 " -> 1299. Blank or invalid -> null. */
export function toNumber(v) {
  const cleaned = text(v).replace(/₹|rs\.?|inr|,|\s/gi, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** "S, M ,L" -> ["S","M","L"]. Duplicates removed, order kept. */
export function toList(v) {
  const seen = new Set();
  const out = [];
  for (const part of text(v).split(/[,\n]+/)) {
    const item = part.trim();
    const key = item.toLowerCase();
    if (item && !seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/** "Rayon Printed Kurti" -> "rayon-printed-kurti". */
export function slugify(v) {
  return text(v)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function productSlug(name, id) {
  return [slugify(name), slugify(id)].filter(Boolean).join("-");
}

// ---------- settings ----------

export const DEFAULT_SETTINGS = {
  businessName: "AH Enterprise",
  tagline: "",
  whatsappNumber: "",
  whatsappGreeting: "Assalamu Alaikum / Hello AH Enterprise 👋",
  announcement: "",
  instagramUrl: "",
  locationText: "",
  primaryColor: "#7A2E4A",
  currencySymbol: "₹",
  deliveryNote: "",
  returnPolicyNote: "",
};

const SETTING_KEYS = {
  business_name: "businessName",
  tagline: "tagline",
  whatsapp_number: "whatsappNumber",
  whatsapp_greeting: "whatsappGreeting",
  announcement_bar: "announcement",
  instagram_url: "instagramUrl",
  location_text: "locationText",
  primary_color: "primaryColor",
  currency_symbol: "currencySymbol",
  delivery_note: "deliveryNote",
  return_policy_note: "returnPolicyNote",
};

export function normalizeSettings(rows, warn) {
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    const rawKey = text(row.key).toLowerCase().replace(/[^a-z0-9]+/g, "_");
    if (!rawKey) continue;
    const key = SETTING_KEYS[rawKey];
    if (!key) {
      warn("Settings", row.__row, `unknown setting "${text(row.key)}" (ignored)`);
      continue;
    }
    const value = text(row.value);
    if (value !== "") settings[key] = value;
  }

  if (settings.whatsappNumber) {
    const digits = settings.whatsappNumber.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15 || /x/i.test(settings.whatsappNumber)) {
      warn("Settings", null, `whatsapp_number "${settings.whatsappNumber}" is not a full number. Use country code + number, digits only, e.g. 919876543210`);
      settings.whatsappNumber = "";
    } else {
      settings.whatsappNumber = digits;
    }
  } else {
    warn("Settings", null, "whatsapp_number is empty, so orders open WhatsApp without a chat selected");
  }

  if (!/^#[0-9a-f]{6}$/i.test(settings.primaryColor)) {
    warn("Settings", null, `primary_color "${settings.primaryColor}" must look like #7A2E4A; using the default`);
    settings.primaryColor = DEFAULT_SETTINGS.primaryColor;
  }

  if (settings.instagramUrl && !/^https:\/\//i.test(settings.instagramUrl)) {
    warn("Settings", null, "instagram_url must start with https://");
    settings.instagramUrl = "";
  }

  return settings;
}

// ---------- categories ----------

export function normalizeCategories(rows, warn) {
  const seen = new Set();
  const categories = [];
  for (const row of rows) {
    const slug = slugify(row.slug);
    const name = text(row.name);
    if (!slug) {
      warn("Categories", row.__row, "missing slug");
      continue;
    }
    if (seen.has(slug)) {
      warn("Categories", row.__row, `slug "${slug}" is used twice (second one ignored)`);
      continue;
    }
    // Categories are shown unless active is explicitly No.
    if (text(row.active) !== "" && !yes(row.active)) continue;
    seen.add(slug);

    let image = null;
    if (text(row.image)) {
      const img = toImage(row.image);
      if (img?.error) warn("Categories", row.__row, `image: ${img.error}`);
      else image = img;
    }

    categories.push({
      slug,
      name: name || slug,
      image,
      sortOrder: toNumber(row.sort_order),
      row: row.__row,
    });
  }
  categories.sort(bySortOrder);
  return categories;
}

// ---------- products ----------

export function normalizeProducts(rows, categorySlugs, warn) {
  const products = [];
  const seenIds = new Map();
  let hidden = 0;

  for (const row of rows) {
    const where = row.__row;
    const id = text(row.id);
    const name = text(row.name);

    if (!yes(row.active)) {
      hidden++;
      if (text(row.active) !== "" && text(row.active).toLowerCase() !== "no") {
        warn("Products", where, `active is "${text(row.active)}"; use Yes or No (treated as No)`);
      }
      continue;
    }

    const problems = [];
    if (!id) problems.push("missing id");
    if (!name) problems.push("missing name");

    const price = toNumber(row.price);
    if (price === null) problems.push(text(row.price) ? `price "${text(row.price)}" is not a number` : "missing price");
    else if (price <= 0) problems.push("price must be more than 0");

    const images = [];
    for (const link of splitImageCell(row.images)) {
      const img = toImage(link);
      if (img?.error) warn("Products", where, `${id || "product"} image: ${img.error}`);
      else if (img) images.push(img);
    }
    if (images.length === 0) problems.push("missing image");

    if (id && seenIds.has(id.toLowerCase())) {
      problems.push(`id ${id} is already used on row ${seenIds.get(id.toLowerCase())}`);
    }

    if (problems.length) {
      warn("Products", where, `${problems.join(", ")} — product not shown`);
      continue;
    }
    seenIds.set(id.toLowerCase(), where);

    let offerPrice = toNumber(row.offer_price);
    if (text(row.offer_price) && offerPrice === null) {
      warn("Products", where, `${id}: offer_price "${text(row.offer_price)}" is not a number (ignored)`);
    } else if (offerPrice !== null && (offerPrice <= 0 || offerPrice >= price)) {
      warn("Products", where, `${id}: offer_price must be lower than price (ignored)`);
      offerPrice = null;
    }
    const finalPrice = offerPrice ?? price;
    const discountPercent = offerPrice ? Math.round(((price - offerPrice) / price) * 100) : 0;

    const sizes = toList(row.sizes);
    const sizeKeys = new Set(sizes.map((s) => s.toLowerCase()));
    const outOfStockSizes = [];
    for (const s of toList(row.out_of_stock_sizes)) {
      const match = sizes.find((x) => x.toLowerCase() === s.toLowerCase());
      if (match) outOfStockSizes.push(match);
      else warn("Products", where, `${id}: out-of-stock size "${s}" is not in sizes (ignored)`);
    }
    const soldOut = sizes.length > 0 && outOfStockSizes.length === sizeKeys.size;

    let category = slugify(row.category);
    if (!category) {
      warn("Products", where, `${id}: no category (shown under All only)`);
    } else if (!categorySlugs.has(category)) {
      warn("Products", where, `${id}: category "${text(row.category)}" is not in the Categories tab (shown under All only)`);
    }

    products.push({
      id,
      slug: productSlug(name, id),
      name,
      category,
      price,
      offerPrice,
      finalPrice,
      discountPercent,
      sizes,
      outOfStockSizes,
      soldOut,
      colours: toList(row.colours ?? row.colors),
      fabric: text(row.fabric),
      description: text(row.description),
      images,
      tags: toList(row.tags),
      featured: yes(row.featured),
      sortOrder: toNumber(row.sort_order),
      row: where,
    });
  }

  products.sort(bySortOrder);
  return { products, hidden };
}

/** Lower sort_order first; blanks last; ties keep sheet order. */
function bySortOrder(a, b) {
  const sa = a.sortOrder ?? Infinity;
  const sb = b.sortOrder ?? Infinity;
  if (sa !== sb) return sa - sb;
  return a.row - b.row;
}

// ---------- whole catalog ----------

/**
 * Build the public catalog from parsed sheet rows.
 * Returns { catalog, warnings, stats }.
 */
export function buildCatalog({ productRows, categoryRows, settingRows }) {
  const warnings = [];
  const warn = (tab, row, message) => warnings.push({ tab, row, message });

  const settings = normalizeSettings(settingRows, warn);
  const categories = normalizeCategories(categoryRows, warn);
  const slugs = new Set(categories.map((c) => c.slug));
  const { products, hidden } = normalizeProducts(productRows, slugs, warn);

  // Count products per category; categories with no products are still
  // returned (the site hides them) so the owner can see them in /api/health.
  const counts = new Map();
  for (const p of products) counts.set(p.category, (counts.get(p.category) || 0) + 1);
  for (const c of categories) c.count = counts.get(c.slug) || 0;

  return {
    catalog: { settings, categories, products, generatedAt: new Date().toISOString() },
    warnings,
    stats: {
      products: products.length,
      hiddenProducts: hidden,
      featured: products.filter((p) => p.featured).length,
      soldOut: products.filter((p) => p.soldOut).length,
      categories: categories.length,
      emptyCategories: categories.filter((c) => c.count === 0).map((c) => c.slug),
    },
  };
}
