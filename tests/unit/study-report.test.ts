import test from "node:test";
import assert from "node:assert/strict";
import seed from "../../src/content/starter.json";
import { packSchema } from "../../src/lib/schema";
import { emptyProgress } from "../../src/lib/learning";
import {
  studyReportSchema,
  createStudyReport,
  studyReportHtml,
  classroomCsv,
  classroomHtml,
} from "../../src/lib/study-report";
const content = packSchema.parse(seed);
test("shared summaries contain counts without notes or private word lists", () => {
  const report = createStudyReport(
    {
      ...emptyProgress,
      saved: ["curious", "removed"],
      completed: ["present-simple"],
      notes: { "w/curious": "Private" },
      activity: { "2026-10-12": 3, "2026-12-31": 20 },
      reviews: { curious: { repetitions: 3, due: "2026-10-12", interval: 3 } },
    },
    content,
    "  Student  ",
    new Date(2026, 9, 12, 12),
  );
  assert.equal(report.name, "Student");
  assert.equal(
    createStudyReport(emptyProgress, content, "\u200fعلی\u061c").name,
    "علی",
  );
  assert.equal(report.summary.wordsSaved, 1);
  assert.equal(report.summary.wordsLearned, 1);
  assert.equal(report.summary.studyDays, 1);
  assert.equal(report.summary.activities, 3);
  assert.equal(JSON.stringify(report).includes("Private"), false);
  assert.equal(JSON.stringify(report).includes("curious"), false);
  assert.equal(
    studyReportSchema.safeParse({ ...report, selfReported: false }).success,
    false,
  );
});
test("print sheets escape values and spreadsheet rows protect formula-like names", () => {
  const report = createStudyReport(
    emptyProgress,
    content,
    '=A,<script>"student"</script>',
  );
  assert.ok(!studyReportHtml(report).includes("NaN"));
  assert.ok(studyReportHtml(report).includes("&lt;script&gt;"));
  assert.ok(!studyReportHtml(report).includes("<script>"));
  assert.ok(classroomHtml([report]).includes("&lt;script&gt;"));
  assert.ok(
    classroomCsv([report]).includes(`"'=A,<script>""student""</script>"`),
  );
  assert.throws(() => classroomCsv([]));
  assert.throws(() => classroomHtml(Array(201).fill(report)));
  const assignments = {
    ...report,
    assignments: [{ title: "School", done: 2, total: 1 }],
  };
  assert.equal(studyReportSchema.safeParse(assignments).success, false);
});

test("summary consistency rejects impossible counts and strips private fields", () => {
  const report = createStudyReport(emptyProgress, content);
  for (const summary of [
    { ...report.summary, wordsLearned: 1 },
    { ...report.summary, studyDays: 1 },
    { ...report.summary, activities: 1 },
    { ...report.summary, averageScore: 100 },
  ])
    assert.equal(
      studyReportSchema.safeParse({ ...report, summary }).success,
      false,
    );
  assert.equal(
    studyReportSchema.safeParse({ ...report, name: "\u200b" }).success,
    false,
  );
  const stripped = studyReportSchema.parse({
    ...report,
    notes: { private: "Secret" },
    saved: ["curious"],
  });
  assert.equal(JSON.stringify(stripped).includes("Secret"), false);
  const perfect = createStudyReport(
    {
      ...emptyProgress,
      attempts: [
        {
          id: "one",
          title: "Practice",
          date: "2026-10-12T12:00:00.000Z",
          score: 20,
          total: 20,
        },
      ],
    },
    content,
  );
  assert.equal(perfect.summary.averageScore, 100);
});

test("printable reports follow all interface languages and classroom plurals", () => {
  const report = createStudyReport(emptyProgress, content);
  for (const locale of ["en", "fa", "ar", "tr"]) {
    const html = studyReportHtml(report, locale);
    assert.ok(html.includes(`lang="${locale}"`));
    if (locale !== "en") assert.ok(!html.includes("<h1>Study summary</h1>"));
  }
  assert.ok(
    studyReportHtml(
      { ...report, assignments: [{ title: "School", done: 2, total: 3 }] },
      "fa",
    ).includes('<bdi dir="ltr">۲ / ۳</bdi>'),
  );
  assert.ok(classroomHtml([report]).includes("1 student summary"));
  assert.ok(classroomHtml([report], "ar").includes("ملخص طالب واحد"));
  assert.ok(classroomHtml([report, report], "ar").includes("ملخصان للطلاب"));
});
