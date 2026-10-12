import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyProgress,
  scheduleReview,
  isDifficultReview,
  getReview,
} from "../../src/lib/learning";
import { progressSchema, recoverProgress } from "../../src/lib/progress-schema";
import {
  noteKey,
  updateNote,
  updateDeck,
  removeDeck,
} from "../../src/lib/personal-study";

test("old backups gain study defaults without losing existing reviews", () => {
  const legacy: Partial<typeof emptyProgress> = { ...emptyProgress };
  delete legacy.notes;
  delete legacy.decks;
  const old = {
    ...legacy,
    saved: ["curious"],
    reviews: { curious: { interval: 3, due: "2026-10-12", repetitions: 2 } },
  };
  assert.deepEqual(progressSchema.parse(old), { ...old, notes: {}, decks: {} });
  assert.deepEqual(
    recoverProgress({
      ...old,
      notes: { "w/curious": "x".repeat(1501), "l/lesson": "Keep this note" },
      decks: { good: { name: "Good", tags: [], words: [] }, bad: { name: "" } },
    }),
    {
      ...old,
      notes: { "l/lesson": "Keep this note" },
      decks: { good: { name: "Good", tags: [], words: [] } },
    },
  );
});

test("private notes and decks preserve unrelated data and reject oversized input", () => {
  const before = structuredClone(emptyProgress);
  const word = noteKey("word", "same-id");
  const lesson = noteKey("lesson", "same-id");
  const noted = updateNote(
    updateNote(emptyProgress, word, "  A word note  ")!,
    lesson,
    "یادداشت",
  )!;
  assert.equal(noted.notes[word], "A word note");
  assert.equal(noted.notes[lesson], "یادداشت");
  assert.equal(updateNote(noted, word, "x".repeat(1501)), undefined);
  const deck = updateDeck(noted, "travel", {
    name: " Travel ",
    tags: ["class", "class"],
    words: ["curious", "curious", "journey"],
  })!;
  assert.deepEqual(deck.decks["travel"], {
    name: "Travel",
    tags: ["class"],
    words: ["curious", "journey"],
  });
  assert.deepEqual(
    progressSchema.parse(JSON.parse(JSON.stringify(deck))),
    deck,
  );
  assert.equal(
    updateDeck(noted, "__proto__", { name: "Invalid", tags: [], words: [] }),
    undefined,
  );
  assert.ok(
    updateDeck(noted, "duplicates", {
      name: "Duplicate words",
      tags: Array.from({ length: 20 }, (_, index) => " ".repeat(index) + "one"),
      words: Array(1001).fill("curious"),
    }),
  );
  assert.deepEqual(
    progressSchema.parse({
      ...emptyProgress,
      decks: {
        duplicates: {
          name: "One",
          tags: Array(20).fill("one"),
          words: Array(1001).fill("curious"),
        },
      },
    }).decks.duplicates,
    { name: "One", tags: ["one"], words: ["curious"] },
  );
  assert.equal(
    updateDeck(deck, "new", { name: " ", tags: [], words: [] }),
    undefined,
  );
  assert.deepEqual(removeDeck(deck, "travel").notes, noted.notes);
  assert.equal(updateNote(noted, word, " ")!.notes[word], undefined);
  assert.equal(
    updateNote(emptyProgress, noteKey("word", "a".repeat(120)), "maximum ID")!
      .notes["w/" + "a".repeat(120)],
    "maximum ID",
  );
  assert.deepEqual(emptyProgress, before);
  const full = {
    ...emptyProgress,
    decks: Object.fromEntries(
      Array.from({ length: 32 }, (_, index) => [
        String(index),
        { name: String(index), tags: [], words: [] },
      ]),
    ),
  };
  assert.equal(
    updateDeck(full, "extra", { name: "Extra", tags: [], words: [] }),
    undefined,
  );
  assert.ok(updateDeck(full, "0", { name: "Renamed", tags: [], words: [] }));
});

test("review ratings adapt ease, count lapses and preserve legacy intervals", () => {
  const now = new Date(2026, 9, 12, 12);
  const previous = { interval: 10, repetitions: 3, due: "2026-10-12" };
  assert.ok(
    scheduleReview(previous, "easy", now).interval >
      scheduleReview(previous, "good", now).interval,
  );
  assert.ok(
    scheduleReview(previous, "hard", now).interval <
      scheduleReview(previous, "good", now).interval,
  );
  let review = scheduleReview(previous, "again", now);
  for (let index = 0; index < 100; index++)
    review = scheduleReview(review, "again", now);
  assert.equal(review.ease, 1.3);
  assert.equal(review.lapses, 101);
  assert.equal(isDifficultReview(review), true);
  assert.equal(review.due, "2026-10-12");
  for (let index = 0; index < 100; index++)
    review = scheduleReview(review, "easy", now);
  assert.equal(review.ease, 3);
  assert.equal(review.interval, 180);
  assert.equal(isDifficultReview(review), false);
  assert.equal(review.lapses, 101);
  assert.equal(
    progressSchema.shape.reviews.safeParse({ word: review }).success,
    true,
  );
});

test("unreviewed imported IDs cannot inherit object prototype entries", () => {
  assert.equal(getReview({}, "constructor"), undefined);
  const review = scheduleReview(undefined, false);
  assert.equal(getReview({ constructor: review }, "constructor"), review);
  assert.equal(isDifficultReview({ ...review, lapses: 2 }), true);
  assert.equal(
    isDifficultReview({ ...review, lapses: 2, repetitions: 3 }),
    false,
  );
});

test("recovery salvages valid entries from every private progress field", () => {
  const recovered = recoverProgress({
    ...emptyProgress,
    saved: ["curious", ""],
    completed: ["present-simple", null],
    reviews: {
      curious: { interval: 1, due: "2026-10-12", repetitions: 1 },
      broken: { interval: 1, due: "bad" },
    },
    attempts: [
      {
        id: "good",
        title: "Practice",
        date: "2026-10-12T12:00:00.000Z",
        score: 1,
        total: 2,
      },
      { id: "broken" },
    ],
    activity: { "2026-10-12": 2, bad: 3 },
  });
  assert.deepEqual(recovered.saved, ["curious"]);
  assert.deepEqual(recovered.completed, ["present-simple"]);
  assert.deepEqual(Object.keys(recovered.reviews), ["curious"]);
  assert.equal(recovered.attempts.length, 1);
  assert.deepEqual(recovered.activity, { "2026-10-12": 2 });
  assert.equal(
    updateDeck(emptyProgress, "invalid", {
      name: "Deck",
      tags: ["a,b"],
      words: [],
    }),
    undefined,
  );
});
