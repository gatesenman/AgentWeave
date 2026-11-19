import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function flatten(value, prefix = "") {
  const keys = new Set();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (child && typeof child === "object" && !Array.isArray(child)) {
        for (const item of flatten(child, path)) keys.add(item);
      } else {
        keys.add(path);
      }
    }
  }
  return keys;
}

function load(name) {
  return JSON.parse(readFileSync(join(here, "locales", name), "utf8"));
}

describe("desktop locale packs", () => {
  it("keeps en-US and zh-CN keys in lockstep", () => {
    const en = flatten(load("en-US.json"));
    const zh = flatten(load("zh-CN.json"));
    assert.deepEqual([...en].sort(), [...zh].sort());
    assert.ok(en.size >= 400, `expected at least 400 keys, got ${en.size}`);
  });

  it("defines a keyboard :focus-visible ring in the desktop stylesheet", () => {
    const css = readFileSync(join(here, "..", "styles", "index.css"), "utf8");
    assert.match(css, /:focus-visible/);
    assert.match(css, /#6366f1/);
  });
});
