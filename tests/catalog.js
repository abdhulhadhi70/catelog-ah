import { test } from "node:test";
import assert from "node:assert/strict";
import { findProduct, getCatalog } from "../functions/_lib/catalog.js";

const products = [{ id: "AH-1001", slug: "rayon-printed-kurti-ah-1001" }];

test("findProduct: exact slug", () => {
  assert.equal(findProduct(products, "rayon-printed-kurti-ah-1001").canonical, true);
});

test("findProduct: renamed product found by code", () => {
  const r = findProduct(products, "old-name-ah-1001");
  assert.equal(r.product.id, "AH-1001");
  assert.equal(r.canonical, false);
  assert.equal(findProduct(products, "ah-1001").product.id, "AH-1001");
});

test("findProduct: unknown", () => {
  assert.equal(findProduct(products, "nope-ah-9999").product, null);
});

test("getCatalog: no env -> sample data with a setup warning", async () => {
  const r = await getCatalog({}, {}, { fresh: true });
  assert.equal(r.source, "sample");
  assert.equal(r.catalog.products.length, 3);
  assert.match(r.warnings[0].message, /SAMPLE/);
});

test("getCatalog: partial config is an error", async () => {
  await assert.rejects(getCatalog({ SHEET_PRODUCTS_CSV: "https://x" }, {}, { fresh: true }), /Missing setting/);
});
