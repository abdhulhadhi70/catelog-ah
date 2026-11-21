import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCatalog, toNumber, yes, toList, productSlug } from "../functions/_lib/normalize.js";
import { parseCSVObjects } from "../functions/_lib/csv.js";
import { SAMPLE_CSV } from "../functions/_lib/sample.js";
import { readFileSync } from "node:fs";

const IMG = "https://example.com/a.jpg";
const product = (over = {}) => ({ __row: 2, id: "AH-1", active: "Yes", name: "Kurti", category: "kurtis", price: "999", images: IMG, ...over });
const build = (productRows, settingRows = [{ __row: 2, key: "whatsapp_number", value: "919876543210" }]) =>
  buildCatalog({ productRows, categoryRows: [{ __row: 2, slug: "kurtis", name: "Kurtis" }], settingRows });

test("value helpers", () => {
  assert.equal(toNumber("₹1,299"), 1299);
  assert.equal(toNumber("Rs. 899"), 899);
  assert.equal(toNumber(""), null);
  assert.equal(toNumber("abc"), null);
  assert.equal(yes(" YES "), true);
  assert.equal(yes("no"), false);
  assert.deepEqual(toList(" S, m ,S,,L "), ["S", "m", "L"]);
  assert.equal(productSlug("Rayon Printed Kurti", "AH-1001"), "rayon-printed-kurti-ah-1001");
  assert.equal(productSlug("Girls' Frock", "AH-1005"), "girls-frock-ah-1005");
});

test("valid product is normalised", () => {
  const { catalog, warnings } = build([product({ offer_price: "749", sizes: "S,M,L", out_of_stock_sizes: "l", colours: "Maroon" })]);
  const p = catalog.products[0];
  assert.equal(p.slug, "kurti-ah-1");
  assert.equal(p.finalPrice, 749);
  assert.equal(p.discountPercent, 25);
  assert.deepEqual(p.outOfStockSizes, ["L"]);
  assert.equal(p.soldOut, false);
  assert.deepEqual(warnings, []);
});

test("required fields: each missing one skips the row with its sheet row number", () => {
  const { catalog, warnings } = build([
    product({ __row: 3, id: "" }),
    product({ __row: 4, id: "B", name: "" }),
    product({ __row: 5, id: "C", price: "" }),
    product({ __row: 6, id: "D", images: "" }),
  ]);
  assert.equal(catalog.products.length, 0);
  assert.deepEqual(warnings.map((w) => w.row), [3, 4, 5, 6]);
  assert.match(warnings[3].message, /missing image/);
});

test("inactive products are hidden without a warning", () => {
  const { catalog, warnings, stats } = build([product({ active: "No" }), product({ __row: 3, id: "B", active: "" })]);
  assert.equal(catalog.products.length, 0);
  assert.equal(stats.hiddenProducts, 2);
  assert.deepEqual(warnings, []);
});

test("offer price that is not lower is ignored with a warning", () => {
  const { catalog, warnings } = build([product({ offer_price: "1200" })]);
  assert.equal(catalog.products[0].offerPrice, null);
  assert.equal(catalog.products[0].finalPrice, 999);
  assert.equal(warnings.length, 1);
});

test("all sizes out of stock = sold out", () => {
  const { catalog } = build([product({ sizes: "S,M", out_of_stock_sizes: "S, M" })]);
  assert.equal(catalog.products[0].soldOut, true);
});

test("duplicate ids: second is skipped", () => {
  const { catalog, warnings } = build([product(), product({ __row: 3 })]);
  assert.equal(catalog.products.length, 1);
  assert.match(warnings[0].message, /already used on row 2/);
});

test("unknown category still shows, with a warning", () => {
  const { catalog, warnings } = build([product({ category: "Sarees" })]);
  assert.equal(catalog.products.length, 1);
  assert.match(warnings[0].message, /not in the Categories tab/);
});

test("sort_order then sheet order", () => {
  const { catalog } = build([
    product({ __row: 2, id: "A" }),
    product({ __row: 3, id: "B", sort_order: "1" }),
    product({ __row: 4, id: "C", sort_order: "2" }),
  ]);
  assert.deepEqual(catalog.products.map((p) => p.id), ["B", "C", "A"]);
});

test("placeholder WhatsApp number is rejected with a warning", () => {
  const { catalog, warnings } = build([product()], [{ __row: 2, key: "whatsapp_number", value: "91XXXXXXXXXX" }]);
  assert.equal(catalog.settings.whatsappNumber, "");
  assert.match(warnings[0].message, /whatsapp_number/);
});

test("WhatsApp number with + and spaces is cleaned", () => {
  const { catalog } = build([product()], [{ __row: 2, key: "whatsapp_number", value: "+91 98765 43210" }]);
  assert.equal(catalog.settings.whatsappNumber, "919876543210");
});

test("the sheet templates build cleanly", () => {
  const { catalog, stats, warnings } = buildCatalog({
    productRows: parseCSVObjects(SAMPLE_CSV.products),
    categoryRows: parseCSVObjects(SAMPLE_CSV.categories),
    settingRows: parseCSVObjects(SAMPLE_CSV.settings),
  });
  assert.deepEqual(warnings.filter((w) => w.tab !== "Settings"), []);
  assert.equal(stats.products, 3);
  assert.equal(stats.featured, 3);
  assert.equal(catalog.products[0].slug, "dr-morepen-deluxe-stethoscope-st-01a-ah-2001");
  assert.equal(catalog.products[0].discountPercent, 20);
  assert.match(catalog.products[0].description, /\n/);
});

test("sample.js matches sheet-template/ (run npm run sync-sample)", () => {
  for (const [key, file] of [["products", "Products"], ["categories", "Categories"], ["settings", "Settings"]]) {
    const onDisk = readFileSync(new URL(`../sheet-template/${file}.csv`, import.meta.url), "utf8");
    assert.equal(SAMPLE_CSV[key], onDisk, `${file}.csv differs from sample.js`);
  }
});
