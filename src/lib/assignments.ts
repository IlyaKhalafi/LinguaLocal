import { z } from "zod";
import type { ContentPack } from "./schema";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
export const assignmentTitleSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine(
    (value) =>
      !/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(
        value.replace(/[\u200c\u200d]/g, ""),
      ) && /[\p{L}\p{N}]/u.test(value),
    "Use a single-line title",
  );
export const assignmentSchema = z
  .object({
    version: z.literal(1),
    title: assignmentTitleSchema,
    due: z.iso.date().optional(),
    tasks: z
      .array(
        z.object({
          kind: z.enum(["lesson", "book", "word"]),
          id,
        }),
      )
      .min(1)
      .max(20),
  })
  .superRefine((assignment, ctx) => {
    const keys = assignment.tasks.map((task) => `${task.kind}/${task.id}`);
    if (new Set(keys).size !== keys.length)
      ctx.addIssue({
        code: "custom",
        path: ["tasks"],
        message: "Each task must appear once",
      });
  });
export type Assignment = z.infer<typeof assignmentSchema>;
export const ASSIGNMENT_LINK_LIMIT = 8000;

export function encodeAssignment(input: unknown) {
  const assignment = assignmentSchema.parse(input);
  const encoded = JSON.stringify(assignment);
  if (encodeURIComponent(encoded).length > ASSIGNMENT_LINK_LIMIT)
    throw new Error(
      "Assignment link is too long. Use fewer tasks or a shorter title.",
    );
  return encoded;
}
export function decodeAssignment(value: unknown): Assignment | undefined {
  if (typeof value !== "string" || value.length > ASSIGNMENT_LINK_LIMIT) return;
  try {
    const result = assignmentSchema.safeParse(JSON.parse(value));
    if (result.success) return result.data;
  } catch {
    /* Invalid links show a recoverable page. */
  }
}

export function resolveAssignment(assignment: Assignment, pack: ContentPack) {
  return assignment.tasks.map((task) => {
    const item =
      task.kind === "lesson"
        ? pack.lessons.find((item) => item.id === task.id)
        : task.kind === "book"
          ? pack.books.find((item) => item.id === task.id)
          : pack.words.find((item) => item.id === task.id);
    const title = item ? ("word" in item ? item.word : item.title) : task.id;
    const href =
      task.kind === "lesson"
        ? `/lessons/${task.id}`
        : task.kind === "book"
          ? `/library/${task.id}`
          : `/dictionary?word=${task.id}`;
    return {
      ...task,
      key: `${task.kind}/${task.id}`,
      title,
      href,
      available: Boolean(item),
    };
  });
}

export function assignmentLink(
  input: unknown,
  pack: ContentPack,
  address: string,
) {
  const encoded = encodeAssignment(input);
  const assignment = decodeAssignment(encoded)!;
  const missing = resolveAssignment(assignment, pack).filter(
    (task) => !task.available,
  );
  if (missing.length)
    throw new Error(
      `Unknown assignment tasks ${missing.map((task) => task.key).join(", ")}`,
    );
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    throw new Error(
      "Use the school’s full HTTP or HTTPS address, such as http://192.168.1.20:3000.",
    );
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Use the school's HTTP or HTTPS address without a path, query, or credentials.",
    );
  url.pathname = "/assignment";
  url.searchParams.set("plan", encoded);
  if (url.href.length > ASSIGNMENT_LINK_LIMIT)
    throw new Error(
      "Assignment link is too long. Use fewer tasks or a shorter title.",
    );
  return url.href;
}
