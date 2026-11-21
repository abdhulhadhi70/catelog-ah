# AH Enterprise — WhatsApp catalog

A mobile-first product catalog for AH Enterprise (Marancheri, Kerala).
Customers browse, pick a size and colour, and tap **Order on WhatsApp**,
which opens WhatsApp with the product, size, colour, price and link already
typed. There is no cart, checkout or payment: WhatsApp is the checkout.

All products are managed from a Google Sheet. Changing the sheet never needs
a code change or a redeploy.

> Running the shop day to day? Read [`OWNER_GUIDE.md`](OWNER_GUIDE.md).
> This file is the technical setup.

## Stack

| Part | Choice |
|---|---|
| Hosting | Cloudflare Pages (free plan) |
| Frontend | Plain HTML, CSS and vanilla JS modules. **No framework, no build step** |
| Backend | Cloudflare Pages Functions in `functions/` |
| Data | Google Sheet, each tab published to the web as CSV |
| Tests | `node --test`, no dependencies |

## Layout

```
public/                 static files served as-is
  index.html            catalog page (/)
  product.html          product page shell (served at /p/<slug>)
  css/tokens.css        colours, type, spacing, radius, shadows
  css/app.css           components and page layout
  js/                   ES modules: catalog-page, product-page, data, list, whatsapp, ui, format, store
  sample-images/        illustrated preview photos used by the sample data
  icons/                app icons and the default share image
functions/
  index.js              GET /            -> fills in link-preview tags for the home page
  p/[slug].js           GET /p/<slug>    -> product page with link-preview tags; old slugs redirect
  api/catalog.js        GET /api/catalog -> { settings, categories, products, generatedAt, stale }
  api/health.js         GET /api/health  -> counts + every sheet row problem (?fresh=1 re-reads now)
  sitemap.xml.js, robots.txt.js
  _lib/csv.js           CSV parser (quotes, commas/new lines in cells, BOM, CRLF)
  _lib/drive.js         Google Drive share link -> direct image URL
  _lib/normalize.js     rows -> clean data + warnings
  _lib/catalog.js       fetching, caching, last-known-good fallback
  _lib/sample.js        GENERATED copy of sheet-template/ (preview data)
sheet-template/         Products.csv, Categories.csv, Settings.csv
tests/                  unit tests
scripts/                sync-sample.mjs, sample-art.mjs (redraws the preview images)
```

## How the data flows

1. `/api/catalog` fetches the three published CSV links **in parallel** (8 s timeout each).
2. Rows are parsed, cleaned and validated. A bad row is skipped with a warning
   (sheet row number + reason); it never breaks the rest of the catalog.
3. The result is cached for **60 seconds** in memory and in Cloudflare's edge
   cache, and a **last-known-good** copy is kept for 30 days. If Google is down
   or a link breaks, visitors get the last good catalog instead of an error.
4. With **no** sheet variables set, the site uses the sample data from
   `sheet-template/` so it can be previewed. `/api/health` says so.

Validation rules: a product is shown only if `active` is Yes and it has an
`id`, `name`, `price` and at least one image. Ids must be unique.
`offer_price` is used only if lower than `price`. Unknown categories and
out-of-stock sizes that aren't in `sizes` produce warnings.

Images: Drive links (`/file/d/<ID>/view`, `open?id=`, `uc?id=`) become
`https://lh3.googleusercontent.com/d/<ID>=w800` (and `=w400` for thumbnails).
Other `https://` links are used as-is. The Drive file must be shared as
**Anyone with the link – Viewer**.

## Set up from scratch

### 1. The Google Sheet

1. Create a new Google Sheet with three tabs named **Products**, **Categories**
   and **Settings**.
2. In each tab: **File → Import → Upload** the matching CSV from `sheet-template/`,
   choosing **Replace current sheet**.
3. Fill in your real `whatsapp_number` in Settings (country code + number,
   digits only, e.g. `919876543210`).
4. **File → Share → Publish to web.** Under *Link*, pick the **Products** tab
   and **Comma-separated values (.csv)**, then **Publish**. Copy the link.
   Do the same for **Categories** and **Settings**. You now have three links
   that end in `output=csv`.

### 2. Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Choose this GitHub repository and the `main` branch.
3. Build settings: **Framework preset: None**, **Build command: empty**,
   **Build output directory: `public`**.
4. **Environment variables** (Production):

   | Name | Value |
   |---|---|
   | `SHEET_PRODUCTS_CSV` | Products tab CSV link |
   | `SHEET_CATEGORIES_CSV` | Categories tab CSV link |
   | `SHEET_SETTINGS_CSV` | Settings tab CSV link |
   | `CF_ANALYTICS_TOKEN` | optional, see below |

5. **Save and Deploy.** Every push to `main` redeploys. Sheet edits never need a deploy.
6. Open `https://<project>.pages.dev/api/health` and check there are no warnings.

A project created by uploading files directly (`wrangler pages deploy`)
cannot later be switched to Git. Use **Connect to Git** for the permanent
site.

### 3. Custom domain (optional)

Pages project → **Custom domains → Set up a custom domain**, e.g.
`catalog.yourdomain.in`. Cloudflare walks you through the DNS record.

### 4. Web Analytics (optional)

Cloudflare dashboard → **Analytics & Logs → Web Analytics → Add a site**,
choose the JS snippet option, and copy the `token` value from the snippet.
Put it in `CF_ANALYTICS_TOKEN` and redeploy. Leave it empty to disable.

## Local development

Needs Node 18+. Nothing to install: Wrangler runs through `npx`.

```bash
cp .dev.vars.example .dev.vars   # optional: paste your 3 CSV links; no file = sample data
npm run dev                      # http://localhost:8788
npm test                         # unit tests
```

Edited a file in `sheet-template/`? Run `npm run sync-sample` so the preview
data matches (a test fails until you do).

## Notes and limits

- The edge cache is per Cloudflare data centre, so Google sees at most a
  handful of requests a minute.
- Google's own "Publish to web" copy can lag your edits by a few minutes.
  `/api/health?fresh=1` re-reads it immediately.
- "Newest" sort shows the bottom rows of the sheet first (new products are added at the bottom).
- Product links survive renames: `/p/<anything>-ah-1001` finds product `AH-1001`
  and redirects to its current address.
- Muted text is `#6B5F64` and WhatsApp buttons are `#1A7F4B` rather than the
  brief's `#8A7F83` / `#25D366`, because those fail AA contrast with small text.
