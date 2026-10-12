import test from "node:test";
import assert from "node:assert/strict";
import {
  dailyWord,
  distinctGameWords,
  dayKey,
  makeQuiz,
  scheduleReview,
  shuffle,
  streak,
} from "../../src/lib/learning";
import { packSchema } from "../../src/lib/schema";
import seed from "../../src/content/starter.json";
import { levels } from "../../src/lib/schema";
import { gapSentence } from "../../src/lib/practice";
import everyday from "../../src/content/vocabulary/everyday.json";
import advanced from "../../src/content/vocabulary/advanced.json";

const content = packSchema.parse(seed);
test("starter content is valid and contains only unique records", () => {
  assert.equal(content.words.length, 150);
  assert.equal(content.books.length, 6);
  assert.equal(content.lessons.length, 16);
});
test("every level supports a full quiz and new examples support gap practice", () => {
  for (const level of levels) {
    const questions = makeQuiz(
      content.words.filter((word) => word.level === level),
    );
    assert.equal(questions.length, 8, level);
    assert.ok(
      questions.every((question) => question.options.length === 4),
      level,
    );
  }
  for (const word of [...everyday, ...advanced]) {
    assert.ok(gapSentence(word), word.id);
  }
});
test("reviews progress through intervals and forgetting resets the schedule", () => {
  const now = new Date(2026, 9, 11, 12);
  const first = scheduleReview(undefined, true, now);
  assert.deepEqual(first, {
    interval: 1,
    repetitions: 1,
    due: "2026-10-12",
    ease: 2.2,
    lapses: 0,
  });
  const second = scheduleReview(first, true, now);
  assert.equal(second.interval, 3);
  assert.equal(scheduleReview(second, true, now).interval, 7);
  assert.deepEqual(scheduleReview(second, false, now), {
    interval: 0,
    repetitions: 0,
    due: "2026-10-11",
    ease: 2,
    lapses: 1,
  });
});
test("review intervals cross month and year boundaries and remain capped", () => {
  const now = new Date(2026, 11, 31, 12);
  assert.equal(scheduleReview(undefined, true, now).due, "2027-01-01");
  assert.equal(
    scheduleReview(
      { interval: 180, repetitions: 10, due: "2026-12-31" },
      true,
      now,
    ).interval,
    180,
  );
});
test("streak includes yesterday when today has not been started", () => {
  const now = new Date(2026, 9, 11, 12);
  assert.equal(streak({ "2026-10-10": 2, "2026-10-09": 1 }, now), 2);
  assert.equal(streak({ "2026-10-11": 1, "2026-10-10": 2 }, now), 2);
  assert.equal(streak({ "2026-10-09": 2 }, now), 0);
  assert.equal(dayKey(now), "2026-10-11");
});
test("generated questions have one correct option and unique distractors", () => {
  for (let i = 0; i < 20; i++) {
    const quiz = makeQuiz(content.words);
    assert.equal(quiz.length, 8);
    assert.equal(new Set(quiz.map((q) => q.word.id)).size, 8);
    for (const question of quiz) {
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options.map((word) => word.id)).size, 4);
      assert.equal(
        question.options.filter((word) => word.id === question.word.id).length,
        1,
      );
    }
  }
});
test("shuffle leaves source untouched and word of the day is stable", () => {
  const source = [1, 2, 3, 4];
  assert.deepEqual(shuffle(source).sort(), source);
  assert.deepEqual(source, [1, 2, 3, 4]);
  const now = new Date(2026, 9, 11);
  assert.equal(
    dailyWord(content.words, now).id,
    dailyWord(content.words, now).id,
  );
});

test("imported overlapping words never produce indistinguishable game choices", () => {
  const words = content.words.slice(0, 6);
  const duplicates = [
    {
      ...words[0],
      id: "alternate-case",
      word: `  ${words[0].word.toUpperCase()} `,
    },
    {
      ...words[1],
      id: "same-meaning",
      word: "other-term",
      definition: ` ${words[0].definition.toUpperCase().replace(/ /g, "  ")} `,
    },
    {
      ...words[2],
      id: "same-punctuation",
      word: "another-term",
      definition: words[0].definition.replace(/\.$/, "!"),
    },
  ];
  const source = [...words, ...duplicates];
  const before = structuredClone(source);
  assert.deepEqual(distinctGameWords(source), words);
  for (const question of makeQuiz(source, 20)) {
    assert.equal(question.options.length, 4);
    assert.equal(
      new Set(question.options.map((word) => word.definition)).size,
      4,
    );
    assert.ok(question.options.some((word) => word.id === question.word.id));
  }
  assert.deepEqual(makeQuiz([words[0], ...duplicates]), []);
  assert.deepEqual(source, before);
});
