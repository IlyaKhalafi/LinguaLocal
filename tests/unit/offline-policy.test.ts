import test from "node:test";
import assert from "node:assert/strict";
import {
  pageAllowed,
  assetAllowed,
  mediaAllowed,
  byteRange,
  documentLocale,
  offlinePageKey,
} from "../../src/lib/offline-policy";
const origin = "http://school.test";
test("offline storage accepts bounded school pages and immutable assets only", () => {
  assert.ok(pageAllowed(new URL("/assignment?plan=original", origin), origin));
  assert.ok(pageAllowed(new URL("/library/everyday-english", origin), origin));
  for (const route of [
    "/api/content",
    "/api/settings",
    "/games/unknown",
    "/dictionary?_rsc=flight",
    "https://other.test/",
  ])
    assert.equal(pageAllowed(new URL(route, origin), origin), false);
  assert.equal(
    pageAllowed(
      new URL("/dictionary?search=" + "a".repeat(10000), origin),
      origin,
    ),
    false,
  );
  assert.ok(
    assetAllowed(new URL("/_next/static/chunks/example.js", origin), origin),
  );
  assert.equal(
    assetAllowed(new URL("/api/media/book.mp3", origin), origin),
    false,
  );
  assert.ok(mediaAllowed(new URL("/api/media/book.mp3", origin), origin));
  assert.equal(mediaAllowed(new URL("/api/media", origin), origin), false);
  assert.equal(
    mediaAllowed(new URL("/api/media/book.mp3?download=true", origin), origin),
    false,
  );
  assert.equal(
    documentLocale('<html data-quiet="false" lang="fa" dir="rtl">'),
    "fa",
  );
  assert.notEqual(
    offlinePageKey(new URL("/dictionary", origin), "en"),
    offlinePageKey(new URL("/dictionary", origin), "fa"),
  );
});
test("offline media ranges support seeking and reject malformed or unsatisfiable ranges", () => {
  assert.deepEqual(byteRange("bytes=10-19", 100), { start: 10, end: 19 });
  assert.deepEqual(byteRange("bytes=80-", 100), { start: 80, end: 99 });
  assert.deepEqual(byteRange("bytes=-20", 100), { start: 80, end: 99 });
  assert.deepEqual(byteRange("bytes=90-1000", 100), { start: 90, end: 99 });
  assert.deepEqual(byteRange("bytes=-200", 100), { start: 0, end: 99 });
  for (const range of [
    "bytes=-0",
    "bytes=100-",
    "bytes=20-10",
    "bytes=-",
    "bytes=1-2,4-5",
    "bytes=999999999999999999999-",
  ])
    assert.equal(byteRange(range, 100), undefined);
  assert.equal(byteRange("bytes=0-", 0), undefined);
});
