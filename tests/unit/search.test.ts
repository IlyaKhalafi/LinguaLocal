import test from "node:test";
import assert from "node:assert/strict";
import { createSearchIndex, searchIndex } from "../../src/lib/search";

test("search tolerates accents, whitespace and Persian keyboard variants", () => {
  const index = createSearchIndex(
    ["Café İstanbul", "کلاس فارسی", "Don't worry", "A library in the city"],
    (value) => value,
  );
  assert.deepEqual(searchIndex(index, "  istanbul CAFE  "), ["Café İstanbul"]);
  assert.deepEqual(searchIndex(index, "كلاس فارسي"), ["کلاس فارسی"]);
  assert.deepEqual(searchIndex(index, "don’t"), ["Don't worry"]);
  assert.deepEqual(searchIndex(index, "CITY library"), [
    "A library in the city",
  ]);
  assert.deepEqual(
    searchIndex(index, ""),
    index.map((entry) => entry.item),
  );
  assert.deepEqual(searchIndex(index, "missing"), []);
});

test("search preserves collection order and applies exact metadata filters", () => {
  const index = createSearchIndex(
    [
      { title: "Morning journey", level: "A1" },
      { title: "Journey home", level: "B1" },
    ],
    (item) => item.title,
  );
  assert.deepEqual(
    searchIndex(index, "journey", (item) => item.level === "B1").map(
      (item) => item.title,
    ),
    ["Journey home"],
  );
});
