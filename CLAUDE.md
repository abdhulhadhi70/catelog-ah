# CLAUDE.md

WhatsApp product catalog for AH Enterprise (women's clothing, Marancheri, Kerala).
The owner is not a developer and manages everything from a Google Sheet.

Rules:
- No build step and no runtime dependencies. Plain HTML/CSS/ES modules in `public/`. Deployed as a Cloudflare Worker with static assets: `src/worker.js` routes the dynamic paths (`run_worker_first` in wrangler.toml) to handlers in `functions/`. A new dynamic route needs an entry in both.
- No cart, checkout or payment. WhatsApp is the checkout.
- Never hard-code the WhatsApp number or sheet URLs: Settings tab / env vars only.
- Everything from the sheet is escaped (`esc()` in the browser, `escapeHtml` in Functions).
- A bad sheet row must never break the catalog: skip it and add a warning with the row number.
- Content must stay modest and family-friendly.
- After editing `sheet-template/*.csv`, run `npm run sync-sample` (a test checks it).
- Keep `OWNER_GUIDE.md` in plain, simple English when behaviour changes.

Run: `npm test`, `npm run dev`.
