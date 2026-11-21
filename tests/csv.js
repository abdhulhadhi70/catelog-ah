import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCSV, parseCSVObjects, headerKey } from "../functions/_lib/csv.js";

test("simple rows", () => {
  assert.deepEqual(parseCSV("a,b,c\n1,2,3"), [["a", "b", "c"], ["1", "2", "3"]]);
});

test("trailing newline does not add an empty row", () => {
  assert.deepEqual(parseCSV("a,b\n1,2\n"), [["a", "b"], ["1", "2"]]);
});

test("CRLF line endings", () => {
  assert.deepEqual(parseCSV("a,b\r\n1,2\r\n"), [["a", "b"], ["1", "2"]]);
});

test("commas inside quotes", () => {
  assert.deepEqual(parseCSV('id,sizes\n1,"S,M,L"'), [["id", "sizes"], ["1", "S,M,L"]]);
});

test("line breaks inside quotes (CRLF becomes LF)", () => {
  assert.deepEqual(parseCSV('a,b\r\n1,"line one\r\nline two"\r\n'), [["a", "b"], ["1", "line one\nline two"]]);
});

test("doubled quotes are a literal quote", () => {
  assert.deepEqual(parseCSV('a\n"She said ""hi"""'), [["a"], ['She said "hi"']]);
});

test("BOM is removed", () => {
  assert.deepEqual(parseCSV("\uFEFFid,name\n1,x"), [["id", "name"], ["1", "x"]]);
});

test("empty cells and empty last cell", () => {
  assert.deepEqual(parseCSV("a,b,c\n1,,\n"), [["a", "b", "c"], ["1", "", ""]]);
});

test("spaces before an opening quote", () => {
  assert.deepEqual(parseCSV('a,b\n1,  "x, y"'), [["a", "b"], ["1", "x, y"]]);
});

test("a quote in the middle of a field is literal", () => {
  assert.deepEqual(parseCSV('a\n5" heel'), [["a"], ['5" heel']]);
});

test("quoted empty string at end of file", () => {
  assert.deepEqual(parseCSV('a,b\n1,""'), [["a", "b"], ["1", ""]]);
});

test("unicode (₹, emoji, Malayalam)", () => {
  assert.deepEqual(parseCSV("k,v\nsym,₹\ng,👋 സ്വാഗതം"), [["k", "v"], ["sym", "₹"], ["g", "👋 സ്വാഗതം"]]);
});

test("objects: headers normalised, sheet row numbers, blank rows skipped", () => {
  const rows = parseCSVObjects(" ID , Offer Price \nA,100\n,\n\nB,200\n");
  assert.deepEqual(rows, [
    { __row: 2, id: "A", offer_price: "100" },
    { __row: 5, id: "B", offer_price: "200" },
  ]);
});

test("objects: short rows get empty strings", () => {
  assert.deepEqual(parseCSVObjects("a,b,c\n1"), [{ __row: 2, a: "1", b: "", c: "" }]);
});

test("headerKey", () => {
  assert.equal(headerKey(" Out of Stock Sizes "), "out_of_stock_sizes");
});
