import { writeFileAtomically } from "./atomic-file";
import { readUtf8File } from "./text-file";
import { DOCUMENT_LIMIT } from "./document-limits";
import type { ZodType } from "zod";

export async function readValidatedJson<T>(
  file: string,
  schema: ZodType<T>,
  limit = DOCUMENT_LIMIT,
): Promise<T> {
  return schema.parse(
    JSON.parse(await readUtf8File(file, { limit, label: "JSON file" })),
  );
}

export async function writeJsonAtomically(
  file: string,
  value: unknown,
  options: { overwrite?: boolean } = {},
) {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("A JSON value is required.");
  await writeFileAtomically(file, serialized, options);
}
