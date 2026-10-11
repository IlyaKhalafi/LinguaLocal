import test from "node:test";
import assert from "node:assert/strict";
import { parseRange, resolveMedia } from "../../src/lib/media";
import { readLimitedJson } from "../../src/lib/http";

test("range requests support bounded, open-ended, and suffix requests", () => {
  assert.equal(parseRange(null, 1000), null);
  assert.deepEqual(parseRange("bytes=0-99", 1000), { start: 0, end: 99 });
  assert.deepEqual(parseRange("bytes=100-", 1000), { start: 100, end: 999 });
  assert.deepEqual(parseRange("bytes=-100", 1000), { start: 900, end: 999 });
  assert.deepEqual(parseRange("bytes=0-9999", 1000), { start: 0, end: 999 });
  assert.deepEqual(parseRange("bytes=-9999", 1000), { start: 0, end: 999 });
});
test("invalid and unsatisfiable ranges are rejected", () => {
  for (const range of [
    "bytes=1000-",
    "bytes=200-100",
    "bytes=-0",
    "bytes=-",
    "bytes=0-1,3-4",
    "words=0-100",
    "bytes=9007199254740999-",
  ])
    assert.equal(parseRange(range, 1000), "invalid");
  assert.equal(parseRange("bytes=0-0", 0), "invalid");
});
test("media resolution rejects traversal and unsupported files", async () => {
  for (const segments of [
    ["..", "README.md"],
    ["../sample.wav"],
    ["..\\sample.wav"],
    ["sample.txt"],
    [],
  ])
    assert.equal(await resolveMedia(segments), null);
});
test("JSON reader rejects invalid and oversized requests", async () => {
  assert.deepEqual(
    await readLimitedJson(
      new Request("http://localhost", { method: "POST", body: '{"ok":true}' }),
    ),
    { ok: true },
  );
  await assert.rejects(
    readLimitedJson(
      new Request("http://localhost", { method: "POST", body: "invalid" }),
    ),
    /not valid JSON/,
  );
  await assert.rejects(
    readLimitedJson(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify("a".repeat(100)),
      }),
      50,
    ),
    /too large/,
  );
});
