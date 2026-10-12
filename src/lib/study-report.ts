import { escapeHtml as escape } from "./html";
import { spreadsheetCell as csvCell } from "./csv-cell";
import { assignmentTitleSchema } from "./assignments";
import {
  direction,
  numberingSystem,
  parseLocale,
  translate,
  type Locale,
} from "./locale";
import { z } from "zod";
import { dayKey, getReview, type Progress } from "./learning";
import type { ContentPack } from "./schema";

export const STUDY_NAME_LIMIT = 64;
export const studyReportNameSchema = z
  .string()
  .transform((value) =>
    value.replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, ""),
  )
  .pipe(assignmentTitleSchema.max(STUDY_NAME_LIMIT));
const count = z.number().int().nonnegative();
const assignmentReportSchema = z
  .object({
    title: assignmentTitleSchema,
    due: z.iso.date().optional(),
    done: count,
    total: count,
  })
  .refine(
    (value) => value.done <= value.total,
    "Completed tasks exceed the total",
  );
export const studyReportSchema = z.object({
  version: z.literal(1),
  selfReported: z.literal(true),
  generatedAt: z.iso.datetime(),
  name: studyReportNameSchema.optional(),
  summary: z
    .object({
      wordsSaved: count,
      lessonsCompleted: count,
      wordsReviewed: count,
      wordsLearned: count,
      practiceSessions: count,
      averageScore: z.number().int().min(0).max(100).optional(),
      studyDays: count,
      activities: count,
    })
    .superRefine((summary, ctx) => {
      if (summary.wordsLearned > summary.wordsReviewed)
        ctx.addIssue({
          code: "custom",
          path: ["wordsLearned"],
          message: "Learned words must have been reviewed",
        });
      if (
        summary.studyDays > summary.activities ||
        (!summary.studyDays && summary.activities > 0)
      )
        ctx.addIssue({
          code: "custom",
          path: ["studyDays"],
          message: "Study days and activity totals conflict",
        });
      if (!summary.practiceSessions && summary.averageScore !== undefined)
        ctx.addIssue({
          code: "custom",
          path: ["averageScore"],
          message: "An average requires a recorded practice session",
        });
    }),
  assignments: z.array(assignmentReportSchema).max(64),
});
export type StudyReport = z.infer<typeof studyReportSchema>;

export function createStudyReport(
  progress: Progress,
  content: ContentPack,
  name?: string,
  now = new Date(),
): StudyReport {
  const known = new Set([
    ...content.words.map((word) => `word/${word.id}`),
    ...content.lessons.map((lesson) => `lesson/${lesson.id}`),
    ...content.books.map((book) => `book/${book.id}`),
  ]);
  const activity = Object.entries(progress.activity).filter(
    ([day, count]) => day <= dayKey(now) && count > 0,
  );
  return studyReportSchema.parse({
    version: 1,
    selfReported: true,
    generatedAt: now.toISOString(),
    name: name?.trim() || undefined,
    summary: {
      wordsSaved: content.words.filter((word) =>
        progress.saved.includes(word.id),
      ).length,
      lessonsCompleted: content.lessons.filter((lesson) =>
        progress.completed.includes(lesson.id),
      ).length,
      wordsReviewed: content.words.filter((word) =>
        Boolean(getReview(progress.reviews, word.id)),
      ).length,
      wordsLearned: content.words.filter(
        (word) => (getReview(progress.reviews, word.id)?.repetitions ?? 0) >= 3,
      ).length,
      practiceSessions: progress.attempts.length,
      averageScore: progress.attempts.length
        ? Math.round(
            progress.attempts.reduce(
              (total, attempt) => total + (100 * attempt.score) / attempt.total,
              0,
            ) / progress.attempts.length,
          )
        : undefined,
      studyDays: activity.length,
      activities: activity.reduce((total, [, count]) => total + count, 0),
    },
    assignments: Object.values(progress.assignments).map((plan) => ({
      title: plan.title,
      due: plan.due,
      done: plan.checked.length,
      total: plan.tasks.filter(
        (key) => known.has(key) || plan.checked.includes(key),
      ).length,
    })),
  });
}

export const reportLabels = {
  title: "Study summary",
  source: "Student-provided summary",
  classroom: "Classroom summary",
  name: "Name",
  summaries: "{count} student summaries",
  tasks: "Assignment tasks",
  unnamed: "No name provided",
  print: "Print summary",
  generated: "Created",
  assignments: "Assignments",
  complete: "Complete",
  due: "Due date",
  wordsSaved: "Saved words",
  lessonsCompleted: "Completed lessons",
  wordsReviewed: "Words reviewed",
  wordsLearned: "Words learned",
  practiceSessions: "Practice sessions",
  averageScore: "Average score",
  studyDays: "Study days",
  activities: "Activities",
} as const;
export function localizedReportLabels(locale: Locale): ReportLabels {
  return Object.fromEntries(
    Object.entries(reportLabels).map(([key, value]) => [
      key,
      translate(locale, value),
    ]),
  ) as ReportLabels;
}
export type ReportLabels = { [K in keyof typeof reportLabels]: string };
const styles = `*{box-sizing:border-box}body{margin:0;padding:32px 16px;background:#f6f8f4;color:#243f36;font:15px/1.6 system-ui,Arial,sans-serif}main{max-width:920px;margin:auto;background:white;border:1px solid #dfe6dc;border-radius:16px;padding:36px}h1{font-size:28px;line-height:1.2;margin:12px 0}h2{font-size:20px;margin:28px 0 12px}.meta{color:#546550;font-size:13px;margin:0 0 12px}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:24px 0}.stat{background:#eef3e9;padding:16px;border-radius:10px;overflow-wrap:anywhere}.stat strong{display:block;font-size:26px}.stat span{font-size:13px}.table-wrap{overflow-x:auto}.table-wrap:focus-visible{outline:3px solid #597c65;outline-offset:3px}.classroom-table{min-width:820px}table{width:100%;border-collapse:collapse;text-align:start;font-size:13px}th,td{padding:12px 8px;border-bottom:1px solid #dfe6dc;text-align:start;overflow-wrap:anywhere}th{color:#425b44}button{font:inherit;padding:10px 18px;border:0;border-radius:8px;background:#214d39;color:white;cursor:pointer}button:focus-visible{outline:3px solid #597c65;outline-offset:3px}.row{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}@media(max-width:600px){body{padding:12px}main{padding:24px 20px}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}h1{font-size:24px}th,td{padding:10px 6px}}@page{size:A4;margin:15mm}@media print{body{background:white;padding:0;font-size:11pt}main{max-width:none;padding:0;border:0}.no-print{display:none}.table-wrap{overflow:visible}.stats{print-color-adjust:exact}tr{break-inside:avoid}thead{display:table-header-group}h1,h2{break-after:avoid}}`;
function reportDocument(
  title: string,
  body: string,
  labels: ReportLabels,
  locale = "en",
  landscape = false,
) {
  const language = parseLocale(locale);
  const dir = direction(language);
  return `<!doctype html><html lang="${language}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><style>${styles}${landscape ? "@page{size:A4 landscape}" : ""}</style></head><body><main><div class="row"><p class="meta">LinguaLocal · ${escape(labels.source)}</p><button class="no-print" onclick="window.print()">${escape(labels.print)}</button></div>${body}</main></body></html>`;
}

export function studyReportHtml(
  input: StudyReport,
  locale = "en",
  labels: ReportLabels = localizedReportLabels(parseLocale(locale)),
) {
  const report = studyReportSchema.parse(input);
  const language = parseLocale(locale);
  const number = {
    format: (value: number) => translate(language, "{count}", { count: value }),
  };
  const date = new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    calendar: "gregory",
    numberingSystem: numberingSystem(language),
  });
  const body = `<h1>${escape(labels.title)}</h1>${report.name ? `<p><bdi dir="auto">${escape(report.name)}</bdi></p>` : ""}<p class="meta">${escape(labels.generated)} <time datetime="${report.generatedAt}">${escape(date.format(new Date(report.generatedAt)))}</time></p><div class="stats">${Object.entries(
    report.summary,
  )
    .filter(([, value]) => value !== undefined)
    .map(
      ([key, value]) =>
        `<div class="stat"><strong><bdi dir="ltr">${escape(number.format(value))}${key === "averageScore" ? "%" : ""}</bdi></strong><span>${escape(labels[key as keyof StudyReport["summary"]])}</span></div>`,
    )
    .join(
      "",
    )}</div>${report.assignments.length ? `<h2>${escape(labels.assignments)}</h2><div class="table-wrap"><table><thead><tr><th scope="col">${escape(labels.assignments)}</th><th scope="col">${escape(labels.complete)}</th><th scope="col">${escape(labels.due)}</th></tr></thead><tbody>${report.assignments.map((assignment) => `<tr><td><bdi dir="auto">${escape(assignment.title)}</bdi></td><td><bdi dir="ltr">${escape(number.format(assignment.done))} / ${escape(number.format(assignment.total))}</bdi></td><td>${assignment.due ? `<time datetime="${assignment.due}">${escape(date.format(new Date(assignment.due + "T12:00:00")))}</time>` : ""}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
  return reportDocument(labels.title, body, labels, locale);
}

function reports(input: readonly StudyReport[]) {
  if (!input.length || input.length > 200)
    throw new Error("Choose between 1 and 200 student summaries.");
  return input.map((report) => studyReportSchema.parse(report));
}
export function classroomCsv(input: readonly StudyReport[]) {
  const header = [
    "name",
    "generated_at",
    "words_saved",
    "lessons_completed",
    "words_reviewed",
    "words_learned",
    "practice_sessions",
    "average_score",
    "study_days",
    "activities",
    "assignment_tasks_done",
    "self_reported",
  ];
  const rows = reports(input).map((report) =>
    [
      report.name,
      report.generatedAt,
      report.summary.wordsSaved,
      report.summary.lessonsCompleted,
      report.summary.wordsReviewed,
      report.summary.wordsLearned,
      report.summary.practiceSessions,
      report.summary.averageScore,
      report.summary.studyDays,
      report.summary.activities,
      report.assignments.reduce(
        (total, assignment) => total + assignment.done,
        0,
      ),
      "true",
    ]
      .map(csvCell)
      .join(","),
  );
  return "\uFEFF" + header.join(",") + "\r\n" + rows.join("\r\n") + "\r\n";
}
export function classroomHtml(
  input: readonly StudyReport[],
  locale = "en",
  labels: ReportLabels = localizedReportLabels(parseLocale(locale)),
) {
  const collection = reports(input);
  const language = parseLocale(locale);
  const number = (value: number) =>
    escape(translate(language, "{count}", { count: value }));
  const date = new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    calendar: "gregory",
    numberingSystem: numberingSystem(language),
  });
  const headings = [
    labels.name,
    labels.lessonsCompleted,
    labels.wordsLearned,
    labels.practiceSessions,
    labels.averageScore,
    labels.studyDays,
    labels.tasks,
    labels.generated,
  ];
  const body = `<h1>${escape(labels.classroom)}</h1><p class="meta">${escape(translate(language, reportLabels.summaries, { count: collection.length }))}</p><div class="table-wrap" role="region" aria-label="${escape(labels.classroom)}" tabindex="0"><table class="classroom-table"><thead><tr>${headings.map((label) => `<th scope="col">${escape(label)}</th>`).join("")}</tr></thead><tbody>${collection.map((report) => `<tr><td><bdi dir="auto">${escape(report.name ?? labels.unnamed)}</bdi></td><td>${number(report.summary.lessonsCompleted)}</td><td>${number(report.summary.wordsLearned)}</td><td>${number(report.summary.practiceSessions)}</td><td><bdi dir="ltr">${report.summary.averageScore === undefined ? "" : number(report.summary.averageScore) + "%"}</bdi></td><td>${number(report.summary.studyDays)}</td><td>${number(report.assignments.reduce((total, assignment) => total + assignment.done, 0))}</td><td><time datetime="${report.generatedAt}">${escape(date.format(new Date(report.generatedAt)))}</time></td></tr>`).join("")}</tbody></table></div>`;
  return reportDocument(labels.classroom, body, labels, language, true);
}
