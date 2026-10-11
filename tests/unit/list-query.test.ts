import test from "node:test";
import assert from "node:assert/strict";
import { readListQuery, updateListQuery } from "../../src/lib/list-query";

test("shared list links bound input and ignore unsupported filters", () => {
  assert.deepEqual(
    readListQuery(
      new URLSearchParams("level=C2&category=Other&page=-4&saved=yes"),
      ["Reading"],
    ),
    {
      search: "",
      level: "",
      category: "",
      page: 0,
      saved: false,
    },
  );
  const result = readListQuery(
    new URLSearchParams({
      search: "🙂".repeat(201),
      level: "B2",
      category: "Reading",
      page: "3",
      saved: "1",
    }),
    ["Reading"],
  );
  assert.equal(result.search, "🙂".repeat(200));
  assert.equal(result.level, "B2");
  assert.equal(result.category, "Reading");
  assert.equal(result.page, 2);
  assert.equal(result.saved, true);
});

test("list updates preserve unrelated parameters and round-trip punctuation", () => {
  const input = new URLSearchParams("page=4&focus=search&lesson=a");
  const updated = updateListQuery(input, {
    search: "bread & water + tea",
    level: "A1",
    saved: true,
  });
  assert.equal(input.get("page"), "4");
  assert.equal(updated.has("page"), false);
  assert.equal(updated.get("focus"), "search");
  assert.equal(updated.get("lesson"), "a");
  assert.equal(
    readListQuery(new URLSearchParams(updated.toString())).search,
    "bread & water + tea",
  );
  assert.equal(updated.get("saved"), "1");
  assert.equal(
    updateListQuery(updated, { search: undefined }).get("search"),
    "bread & water + tea",
  );
  assert.equal(
    updateListQuery(updated, { search: "", saved: false }).has("saved"),
    false,
  );
  assert.equal(updateListQuery(updated, { page: 2 }).get("page"), "3");
  assert.equal(
    updateListQuery(updated, { page: Number.NaN }).has("page"),
    false,
  );
});
