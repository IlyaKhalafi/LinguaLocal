import { z } from "zod";
import { assignmentTitleSchema } from "./assignments";
import { emptyProgress, type Progress } from "./learning";

const identifier = z.string().min(1).max(120);
export const noteIdentifier = z
  .string()
  .regex(/^[wl]\/./u)
  .max(122);
export const deckIdentifier = identifier.refine(
  (id) => !["__proto__", "constructor", "prototype"].includes(id),
  "Invalid deck ID",
);
export const noteSchema = z.string().trim().min(1).max(1500);
const uniqueItems = (schema: z.ZodString, maximum: number) =>
  z
    .array(schema)
    .max(20000)
    .transform((items) => [...new Set(items)])
    .pipe(z.array(schema).max(maximum));
export const deckSchema = z.object({
  name: z.string().trim().min(1).max(64),
  tags: uniqueItems(
    z
      .string()
      .trim()
      .min(1)
      .max(24)
      .refine((tag) => !tag.includes(","), "Tags cannot contain commas"),
    8,
  ),
  words: uniqueItems(identifier, 1000),
});
const boundedRecord = <T extends z.ZodType>(
  schema: T,
  maximum: number,
  key = identifier,
) =>
  z
    .record(key, schema)
    .refine(
      (items) => Object.keys(items).length <= maximum,
      "Too many entries",
    );
export const reviewSchema = z.object({
  interval: z.number().int().min(0).max(180),
  due: z.iso.date(),
  repetitions: z.number().int().nonnegative(),
  ease: z.number().min(1.3).max(3).optional(),
  lapses: z.number().int().nonnegative().optional(),
});
export const attemptSchema = z
  .object({
    id: identifier,
    title: z.string().min(1).max(100),
    score: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    date: z.iso.datetime(),
  })
  .refine(
    (attempt) => attempt.score <= attempt.total,
    "Score exceeds the number of questions",
  );

const taskIdentifier = z
  .string()
  .regex(/^(lesson|book|word)\/[a-z0-9][a-z0-9-]{0,79}$/);
export const checklistIdentifier = z.string().regex(/^[a-f0-9]{64}$/);
export const checklistSchema = z
  .object({
    title: assignmentTitleSchema,
    due: z.iso.date().optional(),
    tasks: uniqueItems(taskIdentifier, 20).refine(
      (tasks) => tasks.length > 0,
      "At least one task is required",
    ),
    checked: uniqueItems(taskIdentifier, 20),
  })
  .refine(
    (value) => value.checked.every((key) => value.tasks.includes(key)),
    "Checked tasks must belong to the assignment",
  );

export const progressSchema = z.object({
  saved: z.array(identifier).max(20000),
  completed: z.array(identifier).max(1000),
  reviews: z.record(identifier, reviewSchema),
  attempts: z.array(attemptSchema).max(100),
  activity: z.record(z.iso.date(), z.number().int().nonnegative()),
  goal: z.number().int().min(1).max(100),
  notes: boundedRecord(noteSchema, 500, noteIdentifier).default({}),
  decks: boundedRecord(deckSchema, 32, deckIdentifier).default({}),
  assignments: boundedRecord(checklistSchema, 64, checklistIdentifier).default(
    {},
  ),
});

function recoverRecord(
  value: unknown,
  key: z.ZodType,
  schema: z.ZodType,
  maximum: number,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries: [string, unknown][] = [];
  for (const [name, item] of Object.entries(value)) {
    if (!key.safeParse(name).success) continue;
    const result = schema.safeParse(item);
    if (result.success) entries.push([name, result.data]);
    if (entries.length === maximum) break;
  }
  return Object.fromEntries(entries);
}

export function recoverProgress(input: unknown): Progress {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return emptyProgress;
  const fields = input as Record<string, unknown>;
  const recovered = Object.fromEntries(
    Object.entries(progressSchema.shape).map(([key, schema]) => {
      const result = schema.safeParse(fields[key]);
      if (!result.success && ["saved", "completed", "attempts"].includes(key)) {
        const item = key === "attempts" ? attemptSchema : identifier;
        const limit =
          key === "saved" ? 20000 : key === "completed" ? 1000 : 100;
        const recovered = Array.isArray(fields[key])
          ? fields[key]
              .flatMap((value) => {
                const parsed = item.safeParse(value);
                return parsed.success ? [parsed.data] : [];
              })
              .slice(0, limit)
          : [];
        return [key, recovered];
      }
      if (!result.success && key === "reviews")
        return [
          key,
          recoverRecord(fields[key], identifier, reviewSchema, 20000),
        ];
      if (!result.success && key === "activity")
        return [
          key,
          recoverRecord(
            fields[key],
            z.iso.date(),
            z.number().int().nonnegative(),
            20000,
          ),
        ];
      if (!result.success && key === "assignments")
        return [
          key,
          recoverRecord(fields[key], checklistIdentifier, checklistSchema, 64),
        ];
      if (!result.success && key === "notes")
        return [
          key,
          recoverRecord(fields[key], noteIdentifier, noteSchema, 500),
        ];
      if (!result.success && key === "decks")
        return [
          key,
          recoverRecord(fields[key], deckIdentifier, deckSchema, 32),
        ];
      return [
        key,
        result.success ? result.data : emptyProgress[key as keyof Progress],
      ];
    }),
  );
  return progressSchema.parse(recovered);
}
