import { z } from "zod";

export const levels = ["A1", "A2", "B1", "B2", "C1"] as const;
const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
const text = z.string().trim().min(1).max(2000);
export const mediaPathSchema = z
  .string()
  .min(1)
  .max(300)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.includes("..") &&
      !value.includes("\\") &&
      !value.includes(":") &&
      value.split("/").every((segment) => segment && segment !== "."),
    "Use a relative media path",
  );
export const wordSchema = z.object({
  id,
  word: text,
  phonetic: z.string().max(120),
  part: text,
  definition: text,
  example: text,
  level: z.enum(levels),
  synonyms: z.array(text).max(10),
});
export const resourceSchema = z
  .object({
    id,
    title: text,
    kind: z.enum(["audio", "video", "pdf"]),
    file: mediaPathSchema,
    duration: z.string().max(40),
    unit: text,
    transcript: z.string().max(20000).optional(),
    captions: mediaPathSchema.optional(),
  })
  .refine((resource) => {
    const extension = resource.file.split(".").at(-1)?.toLowerCase();
    const supported =
      resource.kind === "audio"
        ? ["mp3", "wav", "ogg", "m4a", "flac"]
        : resource.kind === "video"
          ? ["mp4", "webm"]
          : ["pdf"];
    return supported.includes(extension ?? "");
  }, "The file format must match the resource kind")
  .refine(
    (resource) =>
      !resource.captions || resource.captions.toLowerCase().endsWith(".vtt"),
    "Captions must use WebVTT format",
  );
export const bookSchema = z.object({
  id,
  title: text,
  subtitle: text,
  description: text,
  level: z.enum(levels),
  color: z.enum(["peach", "mint", "lavender", "blue", "yellow", "rose"]),
  category: text,
  resources: z.array(resourceSchema).max(500),
});
export const lessonSchema = z
  .object({
    id,
    title: text,
    description: text,
    level: z.enum(levels),
    category: z.enum(["Grammar", "Vocabulary", "Reading", "Speaking"]),
    minutes: z.number().int().min(1).max(120),
    sections: z
      .array(z.object({ title: text, body: z.string().min(1).max(10000) }))
      .min(1)
      .max(30),
    question: text,
    options: z.array(text).min(2).max(6),
    answer: z.number().int().nonnegative(),
    explanation: text,
  })
  .refine(
    (lesson) => lesson.answer < lesson.options.length,
    "Answer must refer to an option",
  );
export const packSchema = z
  .object({
    version: z.literal(1),
    words: z.array(wordSchema).min(4).max(20000),
    books: z.array(bookSchema).max(300),
    lessons: z.array(lessonSchema).max(1000),
  })
  .superRefine((pack, ctx) => {
    for (const key of ["words", "books", "lessons"] as const) {
      const ids = pack[key].map((item) => item.id);
      if (new Set(ids).size !== ids.length)
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "IDs must be unique",
        });
    }
    for (const book of pack.books) {
      if (
        new Set(book.resources.map((item) => item.id)).size !==
        book.resources.length
      )
        ctx.addIssue({
          code: "custom",
          path: ["books"],
          message: "Resource IDs must be unique within each book",
        });
    }
  });
export const settingsSchema = z.object({
  name: z.string().trim().min(1).max(60),
  welcome: z.string().trim().min(1).max(180),
});
export type Word = z.infer<typeof wordSchema>;
export type Book = z.infer<typeof bookSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type Resource = z.infer<typeof resourceSchema>;
export type ContentPack = z.infer<typeof packSchema>;
export type Settings = z.infer<typeof settingsSchema>;
