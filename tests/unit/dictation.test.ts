import test from "node:test";
import assert from "node:assert/strict";
import { compareDictation, dictationTokens } from "../../src/lib/dictation";

test("dictation ignores case and punctuation while preserving contractions and display offsets", () => {
  const text = "Hello, class! You’re ready.";
  const result = compareDictation(text, "HELLO CLASS you're ready");
  assert.equal(result.correct, true);
  assert.equal(result.score, 4);
  assert.equal(result.total, 4);
  assert.ok(
    result.words.every(
      (word) => text.slice(word.start, word.end) === word.text,
    ),
  );
  assert.deepEqual(result.extra, []);
  assert.equal(compareDictation("Don't", "do not").correct, false);
  assert.equal(compareDictation("café", "cafe").correct, false);
  assert.equal(compareDictation("café", "cafe\u0301").correct, true);
  assert.equal(compareDictation("Straße", "STRASSE").correct, true);
  assert.equal(compareDictation("हिन्दी", "हिन्दी").total, 1);
  assert.equal(compareDictation("ｈｅｌｌｏ", "hello").correct, true);
});

test("missing, extra and substituted words do not shift the whole passage", () => {
  const missing = compareDictation(
    "We walk to school every morning.",
    "We walk school every morning",
  );
  assert.deepEqual(
    missing.words.map((word) => word.correct),
    [true, true, false, true, true, true],
  );
  assert.equal(missing.score, 5);
  const inserted = compareDictation(
    "We walk to school.",
    "We always walk to school",
  );
  assert.ok(inserted.words.every((word) => word.correct));
  assert.deepEqual(inserted.extra, ["always"]);
  assert.equal(inserted.score, 3);
  assert.equal(inserted.correct, false);
  const replaced = compareDictation("The bus is late.", "The train is late");
  assert.deepEqual(
    replaced.words.map((word) => word.correct),
    [true, false, true, true],
  );
  assert.equal(replaced.score, 3);
  assert.deepEqual(replaced.extra, []);
  assert.equal(compareDictation("very very good", "very good").score, 2);
});

test("empty responses and bounded passages are handled predictably", () => {
  assert.equal(compareDictation("Hello class", "").score, 0);
  assert.equal(compareDictation("Hello class", "!!!").score, 0);
  assert.deepEqual(
    dictationTokens("مرحبا, فارسی, Türkçe!").map((word) => word.text),
    ["مرحبا", "فارسی", "Türkçe"],
  );
  assert.throws(() => compareDictation("!!!", "hello"), /reference passage/);
  assert.throws(
    () => compareDictation("hello ".repeat(121), "hello"),
    /word limit/,
  );
  assert.throws(
    () => compareDictation("hello", "a ".repeat(121)),
    /word limit/,
  );
  assert.throws(
    () => compareDictation("x".repeat(2001), "hello"),
    /size limit/,
  );
  const maximum = compareDictation("a ".repeat(120), "a ".repeat(120));
  assert.equal(maximum.score, 120);
});
