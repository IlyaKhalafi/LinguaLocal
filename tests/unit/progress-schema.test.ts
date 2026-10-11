import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyProgress } from "../../src/lib/learning";
import { progressSchema } from "../../src/lib/progress-schema";

test("progress backups reject impossible dates and scores", () => {
  assert.equal(progressSchema.safeParse(emptyProgress).success, true);
  for (const due of ["2026-13-40", "2026-02-30", "2025-02-29"]) {
    assert.equal(
      progressSchema.safeParse({
        ...emptyProgress,
        reviews: { curious: { interval: 1, repetitions: 1, due } },
      }).success,
      false,
    );
  }
  const attempt = {
    id: "one",
    title: "Vocabulary quiz",
    score: 9,
    total: 8,
    date: "2026-10-11T12:00:00.000Z",
  };
  assert.equal(
    progressSchema.safeParse({ ...emptyProgress, attempts: [attempt] }).success,
    false,
  );
  assert.equal(
    progressSchema.safeParse({
      ...emptyProgress,
      attempts: [{ ...attempt, score: 8 }],
    }).success,
    true,
  );
  assert.equal(
    progressSchema.safeParse({ ...emptyProgress, activity: { invalid: 2 } })
      .success,
    false,
  );
});
