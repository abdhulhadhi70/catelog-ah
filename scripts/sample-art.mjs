// Draws the illustrated sample photos in public/sample-images/ and the icons
// in public/icons/. Only needed if you want to redraw them; the site just
// uses the finished .jpg/.png files.
//
//   node scripts/sample-art.mjs      (needs Playwright + Chromium installed)
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const W = 600;
const H = 800;

const backdrop = (a, b) => `
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>
    <linearGradient id="shade" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".22" stop-color="#000" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
    <linearGradient id="fall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="${H - 70}" width="${W}" height="70" fill="#000" opacity=".03"/>`;

const hanger = (y = 150) => `
  <path d="M300 ${y - 4} V${y - 46} q0 -26 22 -26 q20 0 20 18" fill="none" stroke="#8a6a3f" stroke-width="6" stroke-linecap="round"/>
  <path d="M206 ${y + 14} Q300 ${y - 26} 394 ${y + 14}" fill="none" stroke="#a5824f" stroke-width="12" stroke-linecap="round"/>`;

/** Fill a garment outline: base colour, optional print, side shading, light falloff. */
const garment = (d, color, print = "") => `
  <path d="${d}" fill="#000" opacity=".18" filter="url(#soft)" transform="translate(10 18)"/>
  <path d="${d}" fill="${color}"/>
  ${print ? `<path d="${d}" fill="url(#print)"/>` : ""}
  <path d="${d}" fill="url(#shade)"/>
  <path d="${d}" fill="url(#fall)"/>`;

const flowerPrint = (c1, c2, size = 46) => `
  <defs><pattern id="print" width="${size}" height="${size}" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
    <g transform="translate(${size / 4} ${size / 4})" fill="${c1}" opacity=".9">
      <circle r="4" cx="0" cy="-5"/><circle r="4" cx="5" cy="0"/><circle r="4" cx="0" cy="5"/><circle r="4" cx="-5" cy="0"/><circle r="2.4" fill="${c2}"/>
    </g>
    <g transform="translate(${(size * 3) / 4} ${(size * 3) / 4})" fill="${c2}" opacity=".85"><circle r="2.2"/></g>
  </pattern></defs>`;

const dotPrint = (c, size = 22) => `
  <defs><pattern id="print" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
    <circle cx="${size / 2}" cy="${size / 2}" r="2.6" fill="${c}" opacity=".8"/>
    <circle cx="0" cy="0" r="1.6" fill="${c}" opacity=".5"/>
  </pattern></defs>`;

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${body}</svg>`;

// ---------- the garments ----------

const KURTI = "M266 150 Q300 196 334 150 L372 160 L452 204 L482 386 L428 400 L384 262 L398 702 L202 702 L216 262 L172 400 L118 386 L148 204 L228 160 Z";
const kurti = (color, p1, p2) =>
  svg(`${backdrop("#f6efe8", "#e5d6c8")}${flowerPrint(p1, p2)}${hanger()}${garment(KURTI, color, true)}
    <path d="M266 150 Q300 196 334 150" fill="none" stroke="#d8b46a" stroke-width="4"/>
    <path d="M300 178 V250" stroke="#d8b46a" stroke-width="3"/>
    <path d="M206 676 H394" stroke="#d8b46a" stroke-width="5"/>
    <path d="M128 372 L476 372" stroke="none"/>
    <path d="M122 380 L176 394 M478 380 L424 394" stroke="#d8b46a" stroke-width="5" stroke-linecap="round"/>
    <path d="M214 560 L210 700 M386 560 L390 700" stroke="#000" stroke-opacity=".18" stroke-width="2"/>`);

const ABAYA = "M270 148 Q300 176 330 148 L382 164 L474 232 L528 528 L460 546 L408 330 L436 748 L164 748 L192 330 L140 546 L72 528 L126 232 L218 164 Z";
const abaya = () =>
  svg(`${backdrop("#efe9e3", "#d9cfc6")}${hanger(148)}${garment(ABAYA, "#20202a")}
    <path d="M300 170 V748" stroke="#000" stroke-width="3" opacity=".55"/>
    <path d="M300 170 V748" stroke="#fff" stroke-width="1" opacity=".08" transform="translate(3 0)"/>
    <path d="M516 486 L528 528 L460 546 L452 506 Z M84 486 L72 528 L140 546 L148 506 Z" fill="#b8954f"/>
    <path d="M520 498 L456 518 M80 498 L144 518" stroke="#e6cf94" stroke-width="2" stroke-dasharray="6 5"/>
    <path d="M270 148 Q300 176 330 148" fill="none" stroke="#b8954f" stroke-width="3"/>`);

const KURTA = "M268 150 Q300 192 332 150 L370 160 L440 200 L470 360 L420 372 L382 258 L412 640 L188 640 L218 258 L180 372 L130 360 L160 200 L230 160 Z";
const churidar = () =>
  svg(`${backdrop("#f7efe7", "#e8d9cb")}${dotPrint("#ffffff")}${hanger()}${garment(KURTA, "#eea98d", true)}
    <path d="M268 150 Q300 192 332 150" fill="none" stroke="#fff" stroke-width="4"/>
    <path d="M196 614 H404" stroke="#fff" stroke-width="5" opacity=".9"/>
    <path d="M232 168 C 300 260, 360 380, 420 560 L 448 552 C 392 372, 330 250, 262 160 Z" fill="#9fd3ea"/>
    <path d="M232 168 C 300 260, 360 380, 420 560 L 448 552 C 392 372, 330 250, 262 160 Z" fill="url(#shade)"/>
    <path d="M420 560 L448 552 L452 600 L426 606 Z" fill="#9fd3ea"/>
    <path d="M426 590 L452 584" stroke="#d8b46a" stroke-width="4"/>
    <path d="M236 176 C 302 266, 362 386, 424 560" fill="none" stroke="#d8b46a" stroke-width="3"/>
    <path d="M232 660 L246 760 L284 760 L292 660 Z M308 660 L316 760 L354 760 L368 660 Z" fill="#eea98d"/>
    <path d="M246 740 H284 M246 726 H284 M316 740 H354 M316 726 H354" stroke="#000" stroke-opacity=".12" stroke-width="2"/>`);

const saree = () =>
  svg(`${backdrop("#f5ede4", "#e2d1c0")}
    <defs><pattern id="print" width="34" height="34" patternUnits="userSpaceOnUse">
      <path d="M17 9 l4 8 -4 8 -4 -8 Z" fill="#d6b25e" opacity=".85"/></pattern>
      <pattern id="zari" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#c9a14a"/><path d="M0 8 L8 0 L16 8 L8 16 Z" fill="#e7c978"/></pattern></defs>
    <ellipse cx="300" cy="630" rx="230" ry="26" fill="#000" opacity=".14" filter="url(#soft)"/>
    <g transform="translate(0 30)">
      <rect x="96" y="420" width="408" height="160" rx="10" fill="#5a1f2c"/>
      <rect x="96" y="420" width="408" height="160" rx="10" fill="url(#print)"/>
      <rect x="96" y="540" width="408" height="40" fill="url(#zari)"/>
      <rect x="96" y="420" width="408" height="160" rx="10" fill="url(#fall)"/>
      <rect x="110" y="300" width="380" height="140" rx="10" fill="#722f37"/>
      <rect x="110" y="300" width="380" height="140" rx="10" fill="url(#print)"/>
      <rect x="110" y="404" width="380" height="36" fill="url(#zari)"/>
      <path d="M110 300 H490 L440 250 H160 Z" fill="#8a3a45"/>
      <path d="M160 250 H440 L490 300 H110 Z" fill="url(#print)" opacity=".7"/>
      <path d="M380 250 L440 250 L490 300 L430 300 Z" fill="url(#zari)"/>
      <rect x="110" y="300" width="380" height="140" rx="10" fill="url(#fall)"/>
      <path d="M126 452 H474" stroke="#000" stroke-opacity=".2" stroke-width="2"/>
    </g>`);

const FROCK = "M272 172 Q300 196 328 172 L360 180 L404 210 L388 262 L356 252 L352 340 C 420 430, 460 520, 478 612 Q300 650 122 612 C 140 520, 180 430, 248 340 L244 252 L212 262 L196 210 L240 180 Z";
const frock = () =>
  svg(`${backdrop("#f8f1e7", "#ead9c4")}${dotPrint("#ffffff", 26)}${hanger(168)}${garment(FROCK, "#f2c23e", true)}
    <path d="M272 172 Q300 214 328 172 Q300 196 272 172" fill="#fff"/>
    <path d="M248 334 H352 V352 H248 Z" fill="#fff" opacity=".95"/>
    <path d="M300 343 l-30 -16 v32 Z M300 343 l30 -16 v32 Z" fill="#fff"/><circle cx="300" cy="343" r="7" fill="#f7e2a5"/>
    <path d="M130 600 Q300 638 470 600" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="2 10" stroke-linecap="round"/>`);

const NIGHTY = "M268 150 Q300 190 332 150 L378 162 L430 196 L414 262 L388 254 L414 752 L186 752 L212 254 L186 262 L170 196 L222 162 Z";
const nighty = () =>
  svg(`${backdrop("#f4eff2", "#ddd2da")}${flowerPrint("#ffffff", "#8ab9a6", 40)}${hanger()}${garment(NIGHTY, "#b49fcf", true)}
    <path d="M268 150 Q300 190 332 150" fill="none" stroke="#fff" stroke-width="4"/>
    <path d="M300 176 V330" stroke="#fff" stroke-width="3" stroke-dasharray="4 4"/>
    <path d="M190 728 H410" stroke="#fff" stroke-width="4"/>`);

const ART = {
  "kurti-maroon": kurti("#7a2436", "#e7b9a8", "#d8b46a"),
  "kurti-green": kurti("#1d4d3c", "#cfe3c4", "#d8b46a"),
  abaya: abaya(),
  churidar: churidar(),
  saree: saree(),
  frock: frock(),
  nighty: nighty(),
};

// ---------- icons + share card ----------

const mark = (size, radius) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}"><rect width="64" height="64" rx="${radius}" fill="#7A2E4A"/><text x="32" y="41.5" text-anchor="middle" font-family="Georgia, serif" font-size="25" font-weight="600" fill="#FBF8F4">AH</text></svg>`;

const ogCard = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#FBF8F4"/>
  <rect x="0" y="0" width="14" height="630" fill="#7A2E4A"/>
  <circle cx="190" cy="315" r="96" fill="#7A2E4A"/>
  <text x="190" y="348" text-anchor="middle" font-family="Georgia, serif" font-size="92" font-weight="600" fill="#FBF8F4">AH</text>
  <text x="340" y="300" font-family="Georgia, serif" font-size="84" font-weight="600" fill="#2B2024">AH Enterprise</text>
  <text x="344" y="368" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#6B5F64">Modest wear · Order on WhatsApp</text>
</svg>`;

// ---------- render ----------

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
async function shot(markup, w, h, path, type) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0">${markup}</body></html>`);
  const buf = await page.screenshot({ type, quality: type === "jpeg" ? 82 : undefined, clip: { x: 0, y: 0, width: w, height: h }, omitBackground: type === "png" });
  writeFileSync(path, buf);
  console.log(path, `${Math.round(buf.length / 1024)} kB`);
}

mkdirSync(new URL("../public/sample-images/", import.meta.url), { recursive: true });
mkdirSync(new URL("../public/icons/", import.meta.url), { recursive: true });
for (const [name, markup] of Object.entries(ART)) {
  await shot(markup, W, H, new URL(`../public/sample-images/${name}.jpg`, import.meta.url), "jpeg");
}
await shot(mark(192, 0), 192, 192, new URL("../public/icons/icon-192.png", import.meta.url), "png");
await shot(mark(512, 0), 512, 512, new URL("../public/icons/icon-512.png", import.meta.url), "png");
await shot(mark(180, 0), 180, 180, new URL("../public/icons/apple-touch-icon.png", import.meta.url), "png");
await shot(ogCard, 1200, 630, new URL("../public/icons/og-default.jpg", import.meta.url), "jpeg");
await browser.close();
