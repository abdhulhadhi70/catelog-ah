// Formatting and escaping helpers.

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** 1299 -> "₹1,299" (Indian grouping: ₹1,29,999). */
export function money(n, symbol = "₹") {
  return `${symbol}${inr.format(Math.round(Number(n) || 0))}`;
}

/** Escape text before putting it in HTML. Everything from the sheet goes through this. */
export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** "Rayon Printed Kurti" -> "RP" */
export function initials(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  // "AH Enterprise" -> "AH": a short all-capitals first word is already a monogram.
  if (words[0] && /^[A-Z]{2,3}$/.test(words[0])) return words[0];
  return (words.slice(0, 2).map((w) => w[0]).join("") || "AH").toUpperCase();
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Lower-case, accent-free text for searching. */
export function fold(s) {
  return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

// Colour names used in the sheet -> a swatch colour. Anything the browser
// already understands (maroon, navy, peach...) works without being listed.
const SWATCHES = {
  "bottle green": "#0b4d3c",
  "kerala gold": "#c9a14a",
  gold: "#c9a14a",
  wine: "#722f37",
  mint: "#98d7c2",
  peach: "#f6b99b",
  "sky blue": "#87ceeb",
  "off white": "#f5f0e6",
  cream: "#f3e9d2",
  mustard: "#d4a017",
  rust: "#b7410e",
  "dusty pink": "#d8a7a7",
  "rose gold": "#b76e79",
  "navy blue": "#1f2a52",
  multicolour: "linear-gradient(135deg,#e36,#fc3,#3c9,#39f)",
};
export function swatch(name) {
  const key = String(name || "").trim().toLowerCase();
  if (SWATCHES[key]) return SWATCHES[key];
  const compact = key.replace(/\s+/g, "");
  if (window.CSS && CSS.supports("color", compact)) return compact;
  return null;
}
