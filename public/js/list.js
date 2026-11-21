// The enquiry list: a small "basket" kept on this phone. It never totals a
// price or takes payment; it just sends several items in one WhatsApp message.
import { local } from "./store.js";
import { esc, money } from "./format.js";
import { $, imageHTML, openDialog, setupDialog, settleImages, toast } from "./ui.js";
import { listMessage, waLink } from "./whatsapp.js";

const KEY = "ah_enquiry_v1";
const MAX_ITEMS = 30;
let settings = null;

export function items() {
  const list = local.get(KEY, []);
  return Array.isArray(list) ? list : [];
}

function save(list) {
  local.set(KEY, list.slice(0, MAX_ITEMS));
  render();
}

const keyOf = (i) => `${i.id}|${i.size || ""}|${i.colour || ""}`.toLowerCase();

/** Add a product with the chosen size/colour. Returns false if it was already there. */
export function add(product, { size = "", colour = "" } = {}) {
  const item = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.finalPrice,
    image: product.images[0] || null,
    size,
    colour,
  };
  const list = items();
  if (list.some((i) => keyOf(i) === keyOf(item))) return false;
  if (list.length >= MAX_ITEMS) {
    toast(`Your list can hold up to ${MAX_ITEMS} items`);
    return false;
  }
  save([...list, item]);
  return true;
}

function render() {
  const list = items();
  const open = $("#list-open");
  if (open) {
    open.hidden = list.length === 0;
    $("#list-count").textContent = String(list.length);
    open.setAttribute("aria-label", `Enquiry list, ${list.length} item${list.length === 1 ? "" : "s"}`);
  }

  const ul = $("#list-items");
  if (!ul) return;
  ul.innerHTML = list.length
    ? list
        .map(
          (i) => `<li class="list-item">
          <a href="/p/${esc(i.slug)}" tabindex="-1" aria-hidden="true">${imageHTML(i.image, i.name)}</a>
          <div>
            <p class="name"><a href="/p/${esc(i.slug)}" style="color:inherit;text-decoration:none">${esc(i.name)}</a></p>
            <p class="meta">${[`Code ${esc(i.id)}`, i.size && `Size ${esc(i.size)}`, i.colour && esc(i.colour)].filter(Boolean).join(" · ")}</p>
            <p class="meta">${money(i.price, settings?.currencySymbol)}</p>
          </div>
          <button class="icon-btn" type="button" data-key="${esc(keyOf(i))}" aria-label="Take ${esc(i.name)} off the list">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </li>`,
        )
        .join("")
    : `<li class="state" style="padding:var(--sp-6) 0">Your list is empty.</li>`;
  settleImages(ul);

  const send = $("#list-send");
  if (send && settings) send.href = list.length ? waLink(settings.whatsappNumber, listMessage(settings, list)) : "#";
}

/** Wire up the header button and the list sheet. Safe to call again with new settings. */
export function setupList(s) {
  settings = s;
  const sheet = $("#list-sheet");
  if (sheet && !sheet.dataset.ready) {
    sheet.dataset.ready = "1";
    setupDialog(sheet);
    $("#list-open").addEventListener("click", () => {
      render();
      openDialog(sheet);
    });
    sheet.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-key]");
      if (btn) save(items().filter((i) => keyOf(i) !== btn.dataset.key));
    });
    $("#list-clear").addEventListener("click", () => {
      save([]);
      sheet.close();
    });
    $("#list-send").addEventListener("click", (e) => {
      if (!items().length) e.preventDefault();
    });
    // Keep two open tabs in step.
    window.addEventListener("storage", (e) => e.key === KEY && render());
  }
  render();
}
