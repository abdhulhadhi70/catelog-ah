// WhatsApp links and messages.
import { money } from "./format.js";
import { session } from "./store.js";

const SRC_KEY = "ah_src";

/**
 * Remember where the visitor came from (?src=fb-ad, ?src=poster-1) for the
 * rest of this visit, so the WhatsApp message can say "Ref: fb-ad".
 */
export function captureSource() {
  const src = new URLSearchParams(location.search).get("src");
  if (src) session.set(SRC_KEY, src.slice(0, 40).replace(/[^\w.-]/g, ""));
}
export function currentSource() {
  return session.get(SRC_KEY, "");
}

/** wa.me link. With no number set, WhatsApp asks which chat to send to. */
export function waLink(number, message) {
  const digits = String(number || "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function productUrl(product) {
  return `${location.origin}/p/${product.slug}`;
}

function refLine() {
  const src = currentSource();
  return src ? `\nRef: ${src}` : "";
}

/** The message for one product. */
export function productMessage(settings, product, { size, colour } = {}) {
  const parts = [];
  if (product.sizes.length) parts.push(`Size: ${size || "-"}`);
  if (product.colours.length) parts.push(`Colour: ${colour || "-"}`);
  return [
    settings.whatsappGreeting,
    "I'm interested in:",
    `🛍 ${product.name} (Code: ${product.id})`,
    parts.join(" | "),
    `Price: ${money(product.finalPrice, settings.currencySymbol)}`,
    productUrl(product),
  ]
    .filter(Boolean)
    .join("\n") + refLine();
}

/** The message for the whole enquiry list. No total: it is an enquiry. */
export function listMessage(settings, items) {
  const lines = items.map((item, i) => {
    const opts = [item.size && `Size: ${item.size}`, item.colour && `Colour: ${item.colour}`].filter(Boolean).join(" | ");
    return [
      `${i + 1}. ${item.name} (Code: ${item.id})`,
      opts && `   ${opts}`,
      `   ${money(item.price, settings.currencySymbol)}`,
      `   ${location.origin}/p/${item.slug}`,
    ]
      .filter(Boolean)
      .join("\n");
  });
  return `${settings.whatsappGreeting}\nI'd like to ask about these ${items.length} item${items.length === 1 ? "" : "s"}:\n\n${lines.join("\n\n")}${refLine()}`;
}

/** A plain "hello" chat link for the header and floating button. */
export function chatLink(settings) {
  return waLink(settings.whatsappNumber, `${settings.whatsappGreeting}\nI'd like to see your collection.${refLine()}`);
}
