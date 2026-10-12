import { test } from "node:test";
import assert from "node:assert/strict";
import {
  direction,
  textDirection,
  locales,
  messages,
  parseLocale,
  translate,
} from "../../src/lib/locale";

test("supported languages use the appropriate writing direction", () => {
  assert.equal(parseLocale("fa"), "fa");
  assert.equal(parseLocale("ar"), "ar");
  assert.equal(parseLocale("tr"), "tr");
  assert.equal(parseLocale("unexpected"), "en");
  assert.equal(parseLocale(undefined), "en");
  assert.equal(direction("en"), "ltr");
  assert.equal(direction("tr"), "ltr");
  assert.equal(direction("fa"), "rtl");
  assert.equal(direction("ar"), "rtl");
});

test("every translation covers the complete English catalogue and preserves placeholders", () => {
  const keys = Object.keys(messages.en).sort();
  const placeholders = (text: string) =>
    [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const locale of locales) {
    assert.deepEqual(
      Object.keys(messages[locale]).sort(),
      keys,
      `${locale} catalogue`,
    );
    for (const key of keys) {
      assert.ok(messages[locale][key].trim(), `${locale} missing ${key}`);
      assert.deepEqual(
        placeholders(messages[locale][key]),
        placeholders(key),
        `${locale} placeholders in ${key}`,
      );
    }
  }
});

test("translations format numbers and insert text without changing curriculum", () => {
  assert.equal(
    translate("fa", "Save {word}", { word: "curious" }),
    "ذخیره curious",
  );
  assert.equal(translate("tr", "{count} words", { count: 24 }), "24 kelime");
  assert.equal(
    translate("en", "Card {current} of {total}", { current: 1, total: 20 }),
    "Card 1 of 20",
  );
  assert.equal(
    translate("ar", "Original English content"),
    "Original English content",
  );
});

test("English and Arabic counters handle singular, dual, and plural forms", () => {
  assert.equal(
    translate("en", "{count} resources", { count: 1 }),
    "1 resource",
  );
  assert.equal(translate("en", "{count} words", { count: 2 }), "2 words");
  assert.equal(translate("ar", "{count} books", { count: 2 }), "كتابان");
  assert.equal(translate("ar", "{count} books", { count: 3 }), "٣ كتب");
  assert.equal(translate("ar", "{count} books", { count: 11 }), "١١ كتابًا");
});

test("private names use their first letter for native select direction", () => {
  assert.equal(textDirection("Travel", "rtl"), "ltr");
  assert.equal(textDirection("۱۲ تمرین", "ltr"), "rtl");
  assert.equal(textDirection("3 رحلة", "ltr"), "rtl");
  assert.equal(textDirection("... Türkçe", "rtl"), "ltr");
  assert.equal(textDirection("123", "rtl"), "rtl");
});
