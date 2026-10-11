import { z } from "zod";

const identifier = z.string().min(1).max(120);
export const reviewSchema = z.object({
  interval: z.number().int().min(0).max(180),
  due: z.iso.date(),
  repetitions: z.number().int().nonnegative(),
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

export const progressSchema = z.object({
  saved: z.array(identifier).max(20000),
  completed: z.array(identifier).max(1000),
  reviews: z.record(identifier, reviewSchema),
  attempts: z.array(attemptSchema).max(100),
  activity: z.record(z.iso.date(), z.number().int().nonnegative()),
  goal: z.number().int().min(1).max(100),
});
