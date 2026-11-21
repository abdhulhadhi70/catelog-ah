// Shared UI pieces: images, cards, prices, toast, dialogs, and applying the
// Settings tab (name, colour, announcement, footer) to the page.
import { esc, initials } from "./format.js";
import { fallbackHTML } from "./render.js";
export { imageHTML, priceHTML, cardHTML } from "./render.js";
import { chatLink } from "./whatsapp.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---------- images ----------

function settle(img, ok) {
  const box = img.closest(".media");
  if (!box) return;
  box.classList.remove("is-loading");
  if (ok) {
    img.classList.add("is-loaded");
  } else if (!box.querySelector(".fallback")) {
    img.hidden = true;
    box.insertAdjacentHTML("beforeend", fallbackHTML(img.alt));
  }
}

// load/error don't bubble, but they can be caught on the way down.
document.addEventListener("load", (e) => e.target.tagName === "IMG" && settle(e.target, true), true);
document.addEventListener("error", (e) => e.target.tagName === "IMG" && settle(e.target, false), true);

/** For images that finished before their listeners saw them (cached). */
export function settleImages(root = document) {
  for (const img of $$(".media.is-loading img", root)) {
    if (img.complete) settle(img, img.naturalWidth > 0);
  }
}

// ---------- toast ----------

let toastTimer;
export function toast(message) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-on"), 2600);
}

// ---------- dialogs ----------

/** Close on [data-close] and on a tap outside (Escape is built in). */
export function setupDialog(dialog) {
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog || e.target.closest("[data-close]")) dialog.close();
  });
  return dialog;
}

export function openDialog(dialog) {
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

// ---------- settings ----------

export function applySettings(s) {
  if (/^#[0-9a-f]{6}$/i.test(s.primaryColor)) {
    document.documentElement.style.setProperty("--accent", s.primaryColor);
    $('meta[name="theme-color"]')?.setAttribute("content", s.primaryColor);
  }

  $("#brand-name").textContent = s.businessName;
  $("#brand-mark").textContent = initials(s.businessName);
  $("#brand-tagline").textContent = s.tagline || s.locationText || "";

  const bar = $("#announce");
  bar.textContent = s.announcement || "";
  bar.hidden = !s.announcement;

  const chat = chatLink(s);
  for (const a of $$("#header-wa, #fab-wa")) a.href = chat;

  const footer = $("#footer");
  if (footer) {
    footer.innerHTML = [
      `<p><strong>${esc(s.businessName)}</strong>${s.locationText ? ` · ${esc(s.locationText)}` : ""}</p>`,
      s.deliveryNote ? `<p>${esc(s.deliveryNote)}</p>` : "",
      `<p><a href="${esc(chat)}" target="_blank" rel="noopener">WhatsApp us</a>${
        s.instagramUrl ? ` · <a href="${esc(s.instagramUrl)}" target="_blank" rel="noopener">Instagram</a>` : ""
      }</p>`,
      `<p>© ${new Date().getFullYear()} ${esc(s.businessName)}. Orders are confirmed on WhatsApp.</p>`,
    ].join("");
  }
}
