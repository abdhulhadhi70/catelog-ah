// The catalog page (/): featured rail, category chips, search, filters, sort
// and the product grid. Filters live in the URL (?cat=kurtis&q=rayon) so a
// filtered view can be shared and the back button works.
import { debounce, esc, fold, money } from "./format.js";
import { setupList } from "./list.js";
import { bootData, cachedCatalog as cachedCopy, fetchCatalog } from "./data.js";
import { chipsHTML, countText, featuredProducts, gridHTML, heroArtHTML, railHTML, sortProducts, visibleCategories } from "./render.js";
import { $, $$, applySettings, openDialog, setupDialog, settleImages } from "./ui.js";
import { captureSource } from "./whatsapp.js";

captureSource();

const PRICE_RANGES = [
  { key: "u500", min: 0, max: 499, label: (s) => `Under ${money(500, s)}` },
  { key: "500-999", min: 500, max: 999, label: (s) => `${money(500, s)} – ${money(999, s)}` },
  { key: "1000-1999", min: 1000, max: 1999, label: (s) => `${money(1000, s)} – ${money(1999, s)}` },
  { key: "2000", min: 2000, max: Infinity, label: (s) => `${money(2000, s)} and above` },
];
const SORTS = new Set(["featured", "newest", "price-asc", "price-desc"]);

let catalog = null;
let signature = "";
let state = readState();
const hayCache = new WeakMap();

// ---------- URL <-> state ----------

function readState() {
  const p = new URLSearchParams(location.search);
  return {
    cat: p.get("cat") || "",
    q: p.get("q") || "",
    sort: SORTS.has(p.get("sort")) ? p.get("sort") : "featured",
    sizes: (p.get("size") || "").split(",").filter(Boolean),
    price: PRICE_RANGES.some((r) => r.key === p.get("price")) ? p.get("price") : "",
    stock: p.get("stock") === "1",
  };
}

function writeState({ push = false } = {}) {
  const p = new URLSearchParams(location.search);
  const set = (k, v) => (v ? p.set(k, v) : p.delete(k));
  set("cat", state.cat);
  set("q", state.q.trim());
  set("sort", state.sort === "featured" ? "" : state.sort);
  set("size", state.sizes.join(","));
  set("price", state.price);
  set("stock", state.stock ? "1" : "");
  const qs = p.toString();
  const url = `${location.pathname}${qs ? `?${qs}` : ""}`;
  if (url !== location.pathname + location.search) history[push ? "pushState" : "replaceState"](null, "", url);
}

window.addEventListener("popstate", () => {
  state = readState();
  syncControls();
  render();
});

// ---------- filtering ----------

function haystack(p) {
  if (!hayCache.has(p)) {
    const cat = catalog.categories.find((c) => c.slug === p.category);
    hayCache.set(p, fold([p.name, p.id, p.fabric, cat?.name, ...p.tags, ...p.colours, p.description].join(" ")));
  }
  return hayCache.get(p);
}

function inStock(p, size) {
  return !p.outOfStockSizes.some((s) => s.toLowerCase() === size.toLowerCase());
}

function filtered() {
  const words = fold(state.q).split(/\s+/).filter(Boolean);
  const range = PRICE_RANGES.find((r) => r.key === state.price);
  const wanted = state.sizes.map((s) => s.toLowerCase());

  let list = catalog.products.filter((p) => {
    if (state.cat && p.category !== state.cat) return false;
    if (words.length && !words.every((w) => haystack(p).includes(w))) return false;
    if (range && (p.finalPrice < range.min || p.finalPrice > range.max)) return false;
    if (state.stock && p.soldOut) return false;
    if (wanted.length) {
      const ok = p.sizes.some((s) => wanted.includes(s.toLowerCase()) && (!state.stock || inStock(p, s)));
      if (!ok) return false;
    }
    return true;
  });

  return sortProducts(list, state.sort);
}

const filterCount = () => state.sizes.length + (state.price ? 1 : 0) + (state.stock ? 1 : 0) + (state.sort !== "featured" ? 1 : 0);

// ---------- rendering ----------

function render() {
  const s = catalog.settings;
  const categories = visibleCategories(catalog);
  if (state.cat && !categories.some((c) => c.slug === state.cat)) state.cat = "";

  // The server already drew the unfiltered page (functions/index.js). Keep
  // its markup on the first pass so images don't flash or the page jump.
  const grid = $("#grid");
  const keepServerHTML = grid.hasAttribute("data-ssr");
  grid.removeAttribute("data-ssr");

  // Chips
  const chips = $("#chips");
  if (!keepServerHTML) chips.innerHTML = chipsHTML(categories, state.cat);
  const active = $('.chip[aria-pressed="true"]', chips);
  if (active) chips.scrollLeft = active.offsetLeft - chips.clientWidth / 2 + active.clientWidth / 2;

  // Opening section, steps and featured rail: only on the unfiltered view.
  const plain = !state.cat && !state.q && filterCount() === 0;
  $("#hero").hidden = !plain;
  $("#steps").hidden = !plain;
  const featured = featuredProducts(catalog);
  const showFeatured = featured.length > 0 && plain;
  if (!keepServerHTML) $("#hero-art").innerHTML = heroArtHTML(featured.length ? featured : catalog.products);
  $("#featured").hidden = !showFeatured;
  if (showFeatured && !keepServerHTML) $("#featured-rail").innerHTML = railHTML(featured, s);

  // Grid
  const list = filtered();
  const cat = categories.find((c) => c.slug === state.cat);
  $("#products-title").textContent = state.q ? `Results for “${state.q.trim()}”` : cat ? cat.name : "All products";
  $("#result-count").textContent = countText(list.length);
  if (!keepServerHTML) grid.innerHTML = gridHTML(list, s, showFeatured);
  grid.setAttribute("aria-busy", "false");
  $("#empty").hidden = list.length > 0;
  $("#error").hidden = true;

  renderActiveFilters();
  settleImages();
}

function renderActiveFilters() {
  const s = catalog.settings;
  const tags = [];
  const x = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
  for (const size of state.sizes) tags.push(`<button class="tag" type="button" data-drop="size:${esc(size)}">Size ${esc(size)}${x}</button>`);
  const range = PRICE_RANGES.find((r) => r.key === state.price);
  if (range) tags.push(`<button class="tag" type="button" data-drop="price">${esc(range.label(s.currencySymbol))}${x}</button>`);
  if (state.stock) tags.push(`<button class="tag" type="button" data-drop="stock">In stock${x}</button>`);
  $("#active-filters").innerHTML = tags.join("");
  $("#filter-dot").hidden = filterCount() === 0;
}

/** Build the size and price options inside the filter sheet. */
function renderFilterOptions() {
  const s = catalog.settings;
  const sizes = [];
  const seen = new Set();
  for (const p of catalog.products) {
    for (const size of p.sizes) {
      const k = size.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        sizes.push(size);
      }
    }
  }
  $("#f-sizes").innerHTML = sizes.length
    ? sizes.map((size) => `<button class="pill" type="button" data-size="${esc(size)}">${esc(size)}</button>`).join("")
    : `<span class="note">No sizes in the catalog yet.</span>`;

  const ranges = PRICE_RANGES.filter((r) => catalog.products.some((p) => p.finalPrice >= r.min && p.finalPrice <= r.max));
  $("#f-prices").innerHTML = ranges
    .map((r) => `<button class="pill" type="button" data-price="${r.key}">${esc(r.label(s.currencySymbol))}</button>`)
    .join("");
  syncControls();
}

function syncControls() {
  $("#q").value = state.q;
  $("#q-clear").hidden = !state.q;
  $("#sort").value = state.sort;
  $("#f-stock").checked = state.stock;
  const wanted = state.sizes.map((x) => x.toLowerCase());
  for (const b of $$("#f-sizes [data-size]")) b.setAttribute("aria-pressed", String(wanted.includes(b.dataset.size.toLowerCase())));
  for (const b of $$("#f-prices [data-price]")) b.setAttribute("aria-pressed", String(b.dataset.price === state.price));
}

function showError() {
  $("#grid").innerHTML = "";
  $("#grid").setAttribute("aria-busy", "false");
  $("#error").hidden = false;
  $("#empty").hidden = true;
}

// ---------- events ----------

function setCategory(slug) {
  if (state.cat === slug) return;
  state.cat = slug;
  writeState({ push: true });
  render();
}

function wire() {
  $("#chips").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-cat]");
    if (chip) setCategory(chip.dataset.cat);
  });

  const onSearch = debounce(() => {
    writeState();
    render();
  }, 180);
  $("#q").addEventListener("input", (e) => {
    state.q = e.target.value;
    $("#q-clear").hidden = !state.q;
    onSearch();
  });
  $("#q").addEventListener("keydown", (e) => {
    if (e.key === "Enter") e.target.blur(); // closes the phone keyboard
  });
  $("#q-clear").addEventListener("click", () => {
    state.q = "";
    syncControls();
    writeState();
    render();
    $("#q").focus();
  });

  const sheet = setupDialog($("#filter-sheet"));
  $("#filter-open").addEventListener("click", () => {
    syncControls();
    openDialog(sheet);
  });
  const changed = () => {
    syncControls();
    writeState();
    render();
  };
  $("#f-sizes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-size]");
    if (!b) return;
    const k = b.dataset.size.toLowerCase();
    state.sizes = state.sizes.some((x) => x.toLowerCase() === k)
      ? state.sizes.filter((x) => x.toLowerCase() !== k)
      : [...state.sizes, b.dataset.size];
    changed();
  });
  $("#f-prices").addEventListener("click", (e) => {
    const b = e.target.closest("[data-price]");
    if (!b) return;
    state.price = state.price === b.dataset.price ? "" : b.dataset.price;
    changed();
  });
  $("#f-stock").addEventListener("change", (e) => {
    state.stock = e.target.checked;
    changed();
  });
  $("#sort").addEventListener("change", (e) => {
    state.sort = e.target.value;
    changed();
  });
  $("#f-clear").addEventListener("click", () => {
    Object.assign(state, { sizes: [], price: "", stock: false, sort: "featured" });
    changed();
  });
  $("#f-apply").addEventListener("click", () => {
    $("#products").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#active-filters").addEventListener("click", (e) => {
    const b = e.target.closest("[data-drop]");
    if (!b) return;
    const [kind, value] = b.dataset.drop.split(":");
    if (kind === "size") state.sizes = state.sizes.filter((x) => x !== value);
    if (kind === "price") state.price = "";
    if (kind === "stock") state.stock = false;
    changed();
  });

  $("#reset-filters").addEventListener("click", () => {
    state = { cat: "", q: "", sort: "featured", sizes: [], price: "", stock: false };
    syncControls();
    writeState({ push: true });
    render();
  });

  $("#retry").addEventListener("click", () => {
    $("#error").hidden = true;
    load();
  });
}

// ---------- start ----------

function show(data) {
  // Only redraw if something in the sheet actually changed.
  const sig = JSON.stringify([data.settings, data.categories, data.products]);
  if (sig === signature) return;
  signature = sig;
  catalog = data;
  applySettings(data.settings);
  setupList(data.settings);
  renderFilterOptions();
  render();
}

async function load() {
  try {
    show(await fetchCatalog());
  } catch {
    if (!catalog) showError();
  }
}

wire();
// 1) Data the server put in the page, 2) this tab's cached copy, 3) the network.
const first = bootData()?.catalog || cachedCopy();
if (first) show(first);
load();
