import test from "node:test";
import assert from "node:assert/strict";
import { packSchema, settingsSchema } from "../../src/lib/schema";
import seed from "../../src/content/starter.json";

test("content imports reject duplicate IDs, bad answers, and unsafe media paths", () => {
  const duplicate = structuredClone(seed);
  duplicate.words[1].id = duplicate.words[0].id;
  assert.equal(packSchema.safeParse(duplicate).success, false);
  const badAnswer = structuredClone(seed);
  badAnswer.lessons[0].answer = 100;
  assert.equal(packSchema.safeParse(badAnswer).success, false);
  for (const file of [
    "../outside.mp3",
    "/outside.mp3",
    "https://example.com/a.mp3",
    "folder\\a.mp3",
  ]) {
    const badPath = structuredClone(seed);
    badPath.books[0].resources[0].file = file;
    assert.equal(packSchema.safeParse(badPath).success, false);
  }
});
test("settings are trimmed and bounded", () => {
  assert.deepEqual(
    settingsSchema.parse({ name: " School ", welcome: " Welcome " }),
    { name: "School", welcome: "Welcome" },
  );
  assert.equal(
    settingsSchema.safeParse({ name: " ", welcome: "hello" }).success,
    false,
  );
  assert.equal(
    settingsSchema.safeParse({ name: "a".repeat(61), welcome: "hello" })
      .success,
    false,
  );
});
