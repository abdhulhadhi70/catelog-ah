import { test } from "node:test";
import assert from "node:assert/strict";
import { driveFileId, toImage, splitImageCell } from "../functions/_lib/drive.js";

const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz_0123";
const lh3 = (w) => `https://lh3.googleusercontent.com/d/${ID}=w${w}`;

test("file/d/<ID>/view share link", () => {
  assert.deepEqual(toImage(`https://drive.google.com/file/d/${ID}/view?usp=sharing`), { src: lh3(800), thumb: lh3(400) });
});

test("open?id=<ID>", () => {
  assert.equal(driveFileId(`https://drive.google.com/open?id=${ID}`), ID);
});

test("uc?id=<ID>&export=view", () => {
  assert.equal(driveFileId(`https://drive.google.com/uc?id=${ID}&export=view`), ID);
});

test("file/d/<ID> without /view, and /u/0/ variants", () => {
  assert.equal(driveFileId(`https://drive.google.com/file/d/${ID}`), ID);
  assert.equal(driveFileId(`https://drive.google.com/file/u/0/d/${ID}/view`), ID);
});

test("Drive folder link gives a clear error", () => {
  assert.match(toImage("https://drive.google.com/drive/folders/1abcdefghijklmnop").error, /folder/);
});

test("other https URLs are used as-is", () => {
  const url = "https://res.cloudinary.com/demo/image/upload/kurti.jpg";
  assert.deepEqual(toImage(url), { src: url, thumb: url });
});

test("site-relative paths are allowed", () => {
  assert.deepEqual(toImage("/sample-images/a.jpg"), { src: "/sample-images/a.jpg", thumb: "/sample-images/a.jpg" });
});

test("http and junk are rejected", () => {
  assert.ok(toImage("http://example.com/a.jpg").error);
  assert.ok(toImage("kurti photo").error);
  assert.equal(toImage("  "), null);
});

test("image cell split by commas and new lines", () => {
  assert.deepEqual(splitImageCell("https://a.com/1.jpg,\nhttps://a.com/2.jpg , https://a.com/3.jpg"), [
    "https://a.com/1.jpg",
    "https://a.com/2.jpg",
    "https://a.com/3.jpg",
  ]);
});
