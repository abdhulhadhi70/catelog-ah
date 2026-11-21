// The product page (/p/<slug>): gallery, size and colour, "Order on
// WhatsApp", share, add to enquiry list, and "You may also like".
import { bootData, cachedCatalog, fetchCatalog } from "./data.js";
import { esc, money, swatch } from "./format.js";
import { add as addToList, setupList } from "./list.js";
import { $, $$, applySettings, cardHTML, imageHTML, openDialog, priceHTML, setupDialog, settleImages, toast } from "./ui.js";
import { captureSource, productMessage, productUrl, waLink } from "./whatsapp.js";

captureSource();

const slug = decodeURIComponent(location.pathname.split("/p/")[1] || "").replace(/\/$/, "").toLowerCase();
const choice = { size: "", colour: "" };
let product = null;
let settings = null;
let shownSignature = "";

// ---------- find ----------

function findIn(products) {
  const exact = products.find((p) => p.slug === slug);
  if (exact) return exact;
  // Renamed product: match on the product code at the end of the link.
  return products.find((p) => {
    const tail = p.id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return slug === tail || slug.endsWith(`-${tail}`);
  });
}

// ---------- render ----------

function renderProduct() {
  const p = product;
  const s = settings;
  document.title = `${p.name} · ${s.businessName}`;
  $("#product").setAttribute("aria-busy", "false");
  $("#not-found").hidden = true;
  $("#error").hidden = true;
  $("#product").hidden = false;

  // Single options are chosen for the customer.
  const available = p.sizes.filter((x) => !p.outOfStockSizes.includes(x));
  if (!p.sizes.includes(choice.size) || p.outOfStockSizes.includes(choice.size)) choice.size = "";
  if (!p.colours.includes(choice.colour)) choice.colour = "";
  if (available.length === 1) choice.size = available[0];
  if (p.colours.length === 1) choice.colour = p.colours[0];

  // Breadcrumb
  const cat = s.categories?.find((c) => c.slug === p.category);
  $("#crumbs").innerHTML = [
    `<a href="/">Home</a>`,
    cat ? `<span aria-hidden="true">›</span><a href="/?cat=${esc(cat.slug)}">${esc(cat.name)}</a>` : "",
    `<span aria-hidden="true">›</span><span aria-current="page">${esc(p.name)}</span>`,
  ].join("");

  // Gallery
  $("#gallery").innerHTML = p.images
    .map(
      (img, i) =>
        `<button type="button" data-index="${i}" aria-label="Open photo ${i + 1} of ${p.images.length} full screen">${imageHTML(
          img,
          i === 0 ? p.name : `${p.name}, photo ${i + 1}`,
          { eager: i === 0, size: "src" },
        )}</button>`,
    )
    .join("");
  $("#dots").innerHTML =
    p.images.length > 1
      ? p.images.map((_, i) => `<button type="button" data-dot="${i}" aria-label="Photo ${i + 1}" aria-current="${i === 0}"></button>`).join("")
      : "";
  const count = $("#gallery-count");
  count.hidden = p.images.length < 2;
  count.textContent = `1 / ${p.images.length}`;

  // Info
  const facts = [
    p.fabric && ["Fabric", p.fabric],
    p.colours.length > 1 && ["Colours", p.colours.join(", ")],
    cat && ["Category", cat.name],
  ].filter(Boolean);
  const info = $("#info");
  info.innerHTML = `
    ${cat ? `<a class="p-cat" href="/?cat=${esc(cat.slug)}">${esc(cat.name)}</a>` : ""}
    <h1>${esc(p.name)}</h1>
    <p class="p-code">Code: <strong>${esc(p.id)}</strong></p>
    <div class="p-price">${priceHTML(p, s, { large: true })}</div>
    ${p.soldOut ? `<p class="p-sold-out">Currently out of stock. Ask us on WhatsApp when it's back.</p>` : ""}
    ${optionsHTML("size", "Size", p.sizes, p.outOfStockSizes)}
    ${optionsHTML("colour", "Colour", p.colours, [])}
    <div class="p-add"><button class="btn btn-outline btn-block" type="button" id="add-list">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0M12 11v5M9.5 13.5h5"/></svg>
      Add to enquiry list</button></div>
    ${p.description ? `<p class="p-desc">${esc(p.description)}</p>` : ""}
    ${facts.length ? `<dl class="p-facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : ""}
    <div class="p-notes">
      ${s.deliveryNote ? noteHTML("truck", s.deliveryNote) : ""}
      ${s.returnPolicyNote ? noteHTML("return", s.returnPolicyNote) : ""}
    </div>`;
  updateOptionState();

  $("#bar").hidden = false;
  settleImages();
}

function optionsHTML(kind, label, values, disabled) {
  if (!values.length) return "";
  const pills = values
    .map((v) => {
      const off = disabled.includes(v);
      const sw = kind === "colour" ? swatch(v) : null;
      return `<button class="pill" type="button" data-${kind}="${esc(v)}" aria-pressed="false"${off ? ` disabled aria-label="${esc(v)}, out of stock"` : ""}>${
        sw ? `<span class="swatch" style="background:${esc(sw)}"></span>` : ""
      }${esc(v)}</button>`;
    })
    .join("");
  return `<fieldset class="options" id="opt-${kind}"><legend>${label}<span class="chosen" id="chosen-${kind}"></span></legend><div class="pills">${pills}</div></fieldset>`;
}

const ICONS = {
  truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
  return: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
};
function noteHTML(icon, text) {
  return `<p class="p-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[icon]}</svg><span>${esc(text)}</span></p>`;
}

function updateOptionState() {
  for (const kind of ["size", "colour"]) {
    for (const b of $$(`[data-${kind}]`)) b.setAttribute("aria-pressed", String(b.dataset[kind] === choice[kind]));
    const label = $(`#chosen-${kind}`);
    if (label) label.textContent = choice[kind] ? `: ${choice[kind]}` : "";
  }
  $("#order").href = waLink(settings.whatsappNumber, productMessage(settings, product, choice));
}

/** Returns true if every needed choice is made; otherwise nudges the customer. */
function choicesComplete() {
  const p = product;
  const missing = [];
  if (p.sizes.length && !choice.size && !p.soldOut) missing.push("size");
  if (p.colours.length && !choice.colour) missing.push("colour");
  if (!missing.length) return true;

  const first = $(`#opt-${missing[0]}`);
  for (const kind of missing) {
    const el = $(`#opt-${kind}`);
    el.classList.remove("needs-choice");
    void el.offsetWidth; // restart the nudge animation
    el.classList.add("needs-choice");
  }
  first.scrollIntoView({ behavior: "smooth", block: "center" });
  toast(`Please choose a ${missing.join(" and ")} first`);
  return false;
}

function renderRelated(all) {
  const p = product;
  const others = all.filter((x) => x.id !== p.id);
  let picks = others.filter((x) => x.category === p.category).sort((a, b) => a.soldOut - b.soldOut);
  if (picks.length < 4) picks = picks.concat(others.filter((x) => x.category !== p.category && !x.soldOut && x.featured));
  if (picks.length < 4) picks = picks.concat(others.filter((x) => !picks.includes(x) && !x.soldOut));
  picks = [...new Set(picks)].slice(0, 6);
  $("#related").hidden = picks.length === 0;
  $("#related-grid").innerHTML = picks.map((x) => cardHTML(x, settings)).join("");
  settleImages($("#related-grid"));
}

function notFound() {
  $("#product").hidden = true;
  $("#bar").hidden = true;
  $("#not-found").hidden = false;
  document.title = `Product not found · ${settings?.businessName || "AH Enterprise"}`;
}

// ---------- gallery + viewer ----------

function wireGallery() {
  const gallery = $("#gallery");
  const viewer = setupDialog($("#viewer"));
  let index = 0;

  gallery.addEventListener(
    "scroll",
    () => {
      const i = Math.round(gallery.scrollLeft / gallery.clientWidth);
      if (i === index) return;
      index = i;
      for (const d of $$("#dots [data-dot]")) d.setAttribute("aria-current", String(Number(d.dataset.dot) === i));
      $("#gallery-count").textContent = `${i + 1} / ${product.images.length}`;
    },
    { passive: true },
  );
  $("#dots").addEventListener("click", (e) => {
    const d = e.target.closest("[data-dot]");
    if (d) gallery.scrollTo({ left: Number(d.dataset.dot) * gallery.clientWidth, behavior: "smooth" });
  });

  gallery.addEventListener("click", (e) => {
    const b = e.target.closest("[data-index]");
    if (!b) return;
    const track = $("#viewer-track");
    track.innerHTML = product.images
      .map((img, i) => `<div class="viewer-slide"><img src="${esc(img.src)}" alt="${esc(product.name)}, photo ${i + 1}" decoding="async"></div>`)
      .join("");
    openDialog(viewer);
    track.scrollLeft = Number(b.dataset.index) * track.clientWidth;
  });
  // Tap a photo to zoom in; tap again to zoom out.
  $("#viewer-track").addEventListener("click", (e) => {
    const img = e.target.closest(".viewer-slide img");
    if (!img) return;
    e.stopPropagation();
    const slide = img.parentElement;
    const rect = img.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    slide.classList.toggle("is-zoomed");
    if (slide.classList.contains("is-zoomed")) {
      slide.scrollLeft = fx * slide.scrollWidth - slide.clientWidth / 2;
      slide.scrollTop = fy * slide.scrollHeight - slide.clientHeight / 2;
    }
  });
}

// ---------- events ----------

function wire() {
  $("#info").addEventListener("click", (e) => {
    const b = e.target.closest("[data-size], [data-colour]");
    if (b && !b.disabled) {
      const kind = "size" in b.dataset ? "size" : "colour";
      choice[kind] = choice[kind] === b.dataset[kind] ? "" : b.dataset[kind];
      $(`#opt-${kind}`).classList.remove("needs-choice");
      updateOptionState();
      return;
    }
    if (e.target.closest("#add-list")) {
      if (!choicesComplete()) return;
      const added = addToList(product, choice);
      toast(added ? "Added to your enquiry list" : "Already in your enquiry list");
    }
  });

  $("#order").addEventListener("click", (e) => {
    if (!product || !choicesComplete()) {
      e.preventDefault();
      return;
    }
    $("#order").href = waLink(settings.whatsappNumber, productMessage(settings, product, choice));
  });

  $("#share").addEventListener("click", async () => {
    if (!product) return;
    const url = productUrl(product);
    const data = { title: product.name, text: `${product.name} · ${money(product.finalPrice, settings.currencySymbol)}`, url };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (err) {
        if (err.name === "AbortError") return; // they closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      window.prompt("Copy this link:", url);
    }
  });

  $("#retry").addEventListener("click", () => {
    $("#error").hidden = true;
    load();
  });

  wireGallery();
}

// ---------- start ----------

function show(next, s, all, categories) {
  settings = { ...s, categories };
  const cat = categories.find((c) => c.slug === next?.category);
  const sig = JSON.stringify([next, s, cat?.slug, cat?.name]);
  if (!next) {
    applySettings(s);
    setupList(s);
    notFound();
    return;
  }
  if (sig !== shownSignature) {
    shownSignature = sig;
    product = next;
    applySettings(s);
    setupList(s);
    renderProduct();
  }
  if (all) renderRelated(all);
}

async function load() {
  try {
    const data = await fetchCatalog();
    show(findIn(data.products) || null, data.settings, data.products, data.categories);
  } catch {
    if (!product) {
      $("#product").hidden = true;
      $("#error").hidden = false;
    }
  }
}

wire();
// 1) Data the server put in the page, 2) this tab's cached catalog, 3) the network.
const boot = bootData();
const cached = cachedCatalog();
if (cached && findIn(cached.products)) {
  show(findIn(cached.products), cached.settings, cached.products, cached.categories);
} else if (boot?.product) {
  show(boot.product, boot.settings, null, boot.category ? [boot.category] : []);
}
load();
