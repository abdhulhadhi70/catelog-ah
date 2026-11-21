// Loads every server module so a broken import (e.g. a renamed helper in
// public/js/render.js) fails here instead of on Cloudflare.
import { test } from "node:test";
import assert from "node:assert/strict";

test("worker and all route handlers load", async () => {
  const worker = await import("../src/worker.js");
  assert.equal(typeof worker.default.fetch, "function");
  for (const path of ["../functions/index.js", "../functions/p/[slug].js", "../functions/api/catalog.js", "../functions/api/health.js", "../functions/sitemap.xml.js", "../functions/robots.txt.js"]) {
    const mod = await import(path);
    assert.equal(typeof mod.onRequestGet, "function", path);
  }
});

test("every browser script parses", async () => {
  const { readdirSync } = await import("node:fs");
  const { execFileSync } = await import("node:child_process");
  const dir = new URL("../public/js/", import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".js"))) {
    execFileSync(process.execPath, ["--check", new URL(file, dir).pathname], { stdio: "pipe" });
  }
});
