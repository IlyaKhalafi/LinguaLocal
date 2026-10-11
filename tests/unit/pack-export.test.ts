import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import seed from "../../src/content/starter.json";
import { levels, packSchema } from "../../src/lib/schema";
import { selectLevelPack } from "../../src/lib/pack-export";

test("committed gallery packs stay in sync with the original collection", async () => {
  const source = packSchema.parse(seed);
  for (const level of levels) {
    const file = path.join(
      __dirname,
      "../../examples/packs",
      `${level.toLowerCase()}.json`,
    );
    const actual = packSchema.parse(JSON.parse(await readFile(file, "utf8")));
    assert.deepEqual(
      actual,
      selectLevelPack(source, level),
      `Rebuild the ${level} gallery pack`,
    );
  }
});

test("level exports preserve lesson references and stable IDs without changing their source", () => {
  const source = packSchema.parse(seed);
  const before = structuredClone(source);
  for (const level of levels) {
    const pack = selectLevelPack(source, level);
    assert.ok(pack.words.length >= 4);
    assert.ok(pack.books.every((book) => book.level === level));
    assert.ok(pack.lessons.every((lesson) => lesson.level === level));
    const ids = new Set(pack.words.map((word) => word.id));
    for (const lesson of pack.lessons)
      for (const id of lesson.wordIds ?? []) assert.ok(ids.has(id));
    assert.deepEqual(
      pack.words.filter((word) => word.level === level),
      source.words.filter((word) => word.level === level),
    );
    assert.deepEqual(packSchema.parse(pack), pack);
  }
  assert.deepEqual(source, before);
});

test("an export includes referenced words from other levels and rejects incomplete packs", () => {
  const source = packSchema.parse(seed);
  const lesson = source.lessons.find((lesson) => lesson.level === "A1")!;
  const advanced = source.words.find((word) => word.level === "C1")!;
  lesson.wordIds = [advanced.id];
  const pack = selectLevelPack(source, "A1");
  assert.ok(pack.words.some((word) => word.id === advanced.id));
  lesson.wordIds = ["missing-word"];
  assert.throws(() => selectLevelPack(source, "A1"));
  assert.throws(() =>
    selectLevelPack(
      { ...source, words: source.words.slice(0, 4), lessons: [] },
      "C1",
    ),
  );
});
