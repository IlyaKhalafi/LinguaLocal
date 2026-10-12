import test from "node:test";
import assert from "node:assert/strict";
import seed from "../../src/content/starter.json";
import { packSchema } from "../../src/lib/schema";
import { resolveLessonStudy } from "../../src/lib/lesson-study";

test("lesson study keeps selected vocabulary in order and continues at the same level", () => {
  const content = packSchema.parse(seed);
  for (const lesson of content.lessons) {
    const study = resolveLessonStudy(content, lesson.id)!;
    assert.deepEqual(
      study.words.map((word) => word.id),
      lesson.wordIds ?? [],
    );
  }
  const continuations = {
    "small-talk": "present-simple",
    "present-simple": "asking-questions",
    "travel-phrases": "past-time",
    "reading-between-lines": "word-families",
    "giving-opinions": "argument-structure",
    "register-shift": "critical-claims",
    "ordering-food": undefined,
    "email-request": undefined,
    "critical-claims": undefined,
  };
  for (const [id, next] of Object.entries(continuations)) {
    assert.equal(resolveLessonStudy(content, id)?.next?.id, next, id);
  }
  assert.equal(resolveLessonStudy(content, "unknown"), undefined);
  const final = content.lessons.at(-1)!;
  assert.equal(resolveLessonStudy(content, final.id)?.next, undefined);
});

test("older lessons without linked words still resolve with an empty review scope", () => {
  const content = packSchema.parse(seed);
  delete content.lessons[0].wordIds;
  assert.deepEqual(
    resolveLessonStudy(content, content.lessons[0].id)?.words,
    [],
  );
});
