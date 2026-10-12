import { emptyProgress } from "../../src/lib/learning";
import { updateChecklist } from "../../src/lib/personal-study";
import { progressSchema } from "../../src/lib/progress-schema";
import test from "node:test";
import assert from "node:assert/strict";
import seed from "../../src/content/starter.json";
import { packSchema } from "../../src/lib/schema";
import {
  assignmentLink,
  assignmentSchema,
  decodeAssignment,
  encodeAssignment,
  resolveAssignment,
} from "../../src/lib/assignments";

const pack = packSchema.parse(seed);
const plan = {
  version: 1,
  title: " تمرین روزانه ",
  due: "2026-12-01",
  tasks: [
    { kind: "lesson", id: "present-simple" },
    { kind: "word", id: "curious" },
  ],
};
test("assignment links round trip Unicode, dates and exact tasks", () => {
  const link = new URL(assignmentLink(plan, pack, "http://192.168.1.20:3000"));
  const decoded = decodeAssignment(link.searchParams.get("plan"))!;
  assert.equal(decoded.title, "تمرین روزانه");
  assert.equal(decoded.due, "2026-12-01");
  assert.equal(link.pathname, "/assignment");
  assert.deepEqual(
    resolveAssignment(decoded, pack).map((task) => [task.key, task.available]),
    [
      ["lesson/present-simple", true],
      ["word/curious", true],
    ],
  );
  assert.equal(decodeAssignment(encodeAssignment(plan))?.tasks.length, 2);
});
test("invalid and stale assignment tasks stay recoverable", () => {
  assert.equal(decodeAssignment("broken"), undefined);
  assert.equal(decodeAssignment("x".repeat(8001)), undefined);
  assert.equal(
    assignmentSchema.safeParse({ ...plan, due: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    assignmentSchema.safeParse({
      ...plan,
      tasks: [plan.tasks[0], plan.tasks[0]],
    }).success,
    false,
  );
  assert.throws(
    () =>
      assignmentLink(
        { ...plan, tasks: [{ kind: "book", id: "missing" }] },
        pack,
        "http://localhost:3000",
      ),
    /Unknown assignment/,
  );
  for (const address of [
    "file:///tmp",
    "http://user@school",
    "http://school/path",
    "http://school?other=1",
    "http://school/#other",
  ])
    assert.throws(() => assignmentLink(plan, pack, address));
  const missing = resolveAssignment(
    assignmentSchema.parse({
      ...plan,
      tasks: [{ kind: "lesson", id: "missing" }],
    }),
    pack,
  );
  assert.equal(missing[0].available, false);
  for (const title of ["A\nB", "\u200b", "a\u2028b", "a\u202eb"])
    assert.equal(assignmentSchema.safeParse({ ...plan, title }).success, false);
  assert.equal(
    assignmentSchema.safeParse({ ...plan, title: "تمرین‌های روزانه" }).success,
    true,
  );
});

test("private checklists preserve unrelated data and respect the task list", () => {
  const id = "a".repeat(64);
  const plan = {
    title: "School",
    tasks: ["lesson/present-simple", "word/curious"],
  };
  const checked = updateChecklist(
    emptyProgress,
    id,
    plan,
    "word/curious",
    true,
  )!;
  assert.deepEqual(checked.assignments[id].checked, ["word/curious"]);
  assert.equal(
    updateChecklist(checked, id, plan, "word/missing", true),
    undefined,
  );
  assert.equal(
    updateChecklist(checked, "constructor", plan, "word/curious", true),
    undefined,
  );
  assert.deepEqual(
    updateChecklist(checked, id, plan, "word/curious", false)!.assignments,
    { [id]: { ...plan, checked: [] } },
  );
  assert.equal(progressSchema.safeParse(checked).success, true);
  const full = {
    ...emptyProgress,
    assignments: Object.fromEntries(
      Array.from({ length: 64 }, (_, i) => [
        i.toString(16).padStart(64, "0"),
        { ...plan, checked: ["word/curious"] },
      ]),
    ),
  };
  assert.equal(
    updateChecklist(full, id, plan, "word/curious", true),
    undefined,
  );
  assert.deepEqual(
    updateChecklist(full, "0".repeat(64), plan, "word/curious", false)!
      .assignments["0".repeat(64)],
    { ...plan, checked: [] },
  );
});
