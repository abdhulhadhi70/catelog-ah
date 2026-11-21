// Draws the app icons and default share image in public/icons/. Only needed
// to redraw them; the site just uses the finished .png/.jpg files.
//
//   node scripts/sample-art.mjs      (needs Playwright + Chromium installed)
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

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

mkdirSync(new URL("../public/icons/", import.meta.url), { recursive: true });
await shot(mark(192, 0), 192, 192, new URL("../public/icons/icon-192.png", import.meta.url), "png");
await shot(mark(512, 0), 512, 512, new URL("../public/icons/icon-512.png", import.meta.url), "png");
await shot(mark(180, 0), 180, 180, new URL("../public/icons/apple-touch-icon.png", import.meta.url), "png");
await shot(ogCard, 1200, 630, new URL("../public/icons/og-default.jpg", import.meta.url), "jpeg");
await browser.close();
