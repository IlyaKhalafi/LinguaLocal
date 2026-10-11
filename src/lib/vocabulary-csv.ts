import { parse } from "csv-parse/sync";
import { DOCUMENT_LIMIT } from "./document-limits";
import { z } from "zod";
import { packSchema, wordSchema, type ContentPack, type Word } from "./schema";

const required = ["id", "word", "part", "definition", "example", "level"];
const allowed = new Set([...required, "phonetic", "synonyms"]);
function delimiter(csv: string): string {
  const header = csv
    .replace(/^\uFEFF/, "")
    .trimStart()
    .split(/\r\n|\n|\r/, 1)[0];
  let selected = ",",
    columns = 0;
  for (const candidate of [",", ";"]) {
    try {
      const records = parse(header, {
        delimiter: candidate,
        trim: true,
        max_record_size: 20000,
      }) as string[][];
      const count = records[0]?.length ?? 0;
      if (count > columns) {
        selected = candidate;
        columns = count;
      }
    } catch {
      /* The full parser reports malformed headers below. */
    }
  }
  return selected;
}

export function importVocabulary(csv: string, base?: ContentPack): ContentPack {
  if (Buffer.byteLength(csv) > DOCUMENT_LIMIT)
    throw new Error("CSV file exceeds the size limit.");
  const records = parse(csv, {
    bom: true,
    info: true,
    delimiter: delimiter(csv),
    skip_empty_lines: true,
    trim: true,
    max_record_size: 20000,
    columns: (headers: string[]) => {
      const names = headers.map((header) => header.trim().toLowerCase());
      if (new Set(names).size !== names.length)
        throw new Error("CSV headers must be unique.");
      if (required.some((name) => !names.includes(name)))
        throw new Error(`CSV needs the columns ${required.join(", ")}.`);
      const unknown = names.filter((name) => !allowed.has(name));
      if (unknown.length)
        throw new Error(`Unknown CSV columns ${unknown.join(", ")}.`);
      return names;
    },
  }) as { record: Record<string, string>; info: { lines: number } }[];
  if (!records.length) throw new Error("CSV contains no vocabulary records.");
  if (records.length > 20000)
    throw new Error("CSV contains too many vocabulary records.");
  const words: Word[] = [];
  const issues: z.core.$ZodIssue[] = [];
  const ids = new Set<string>();
  for (const { record, info } of records) {
    const result = wordSchema.safeParse({
      ...record,
      phonetic: record.phonetic ?? "",
      synonyms: (record.synonyms ?? "")
        .split("|")
        .map((word) => word.trim())
        .filter(Boolean),
    });
    if (!result.success)
      issues.push(
        ...result.error.issues.map((issue) => ({
          ...issue,
          path: [`CSV line ${info.lines}`, ...issue.path],
        })),
      );
    else if (ids.has(result.data.id))
      issues.push({
        code: "custom",
        path: [`CSV line ${info.lines}`, "id"],
        message: `Duplicate word ID ${result.data.id}`,
      });
    else {
      ids.add(result.data.id);
      words.push(result.data);
    }
    if (issues.length > 20) break;
  }
  if (issues.length) throw new z.ZodError(issues);
  const merged = new Map((base?.words ?? []).map((word) => [word.id, word]));
  words.forEach((word) => merged.set(word.id, word));
  const content = packSchema.parse({
    ...(base ?? { version: 1, books: [], lessons: [] }),
    words: [...merged.values()],
  });
  if (Buffer.byteLength(JSON.stringify(content)) > DOCUMENT_LIMIT)
    throw new Error("The resulting pack exceeds the size limit.");
  return content;
}
