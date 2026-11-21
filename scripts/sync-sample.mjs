// Copies sheet-template/*.csv into functions/_lib/sample.js, which the site
// uses as preview data until the real Google Sheet links are set.
// Run after editing the templates:  npm run sync-sample
import { readFileSync, writeFileSync } from "node:fs";

const read = (name) => readFileSync(new URL(`../sheet-template/${name}.csv`, import.meta.url), "utf8");
const data = { products: read("Products"), categories: read("Categories"), settings: read("Settings") };

writeFileSync(
  new URL("../functions/_lib/sample.js", import.meta.url),
  `// GENERATED from sheet-template/ by scripts/sync-sample.mjs. Do not edit by hand.\n` +
    `export const SAMPLE_CSV = ${JSON.stringify(data, null, 2)};\n`,
);
console.log("functions/_lib/sample.js updated");
