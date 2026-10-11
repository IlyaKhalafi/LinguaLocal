import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ZodType } from "zod";

export async function readValidatedJson<T>(
  file: string,
  schema: ZodType<T>,
  limit = 2 * 1024 * 1024,
): Promise<T> {
  if ((await stat(/* turbopackIgnore: true */ file)).size > limit)
    throw new Error("JSON file exceeds the size limit.");
  const raw = await readFile(/* turbopackIgnore: true */ file);
  if (raw.byteLength > limit)
    throw new Error("JSON file exceeds the size limit.");
  return schema.parse(JSON.parse(raw.toString("utf8")));
}

export async function writeJsonAtomically(file: string, value: unknown) {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("A JSON value is required.");
  const directory = path.dirname(file);
  await mkdir(directory, { recursive: true });
  const temporary = path.join(
    directory,
    `.${path.basename(file)}.${randomUUID()}.tmp`,
  );
  const handle = await open(temporary, "wx");
  try {
    await handle.writeFile(serialized);
    await handle.sync();
    await handle.close();
    await rename(temporary, /* turbopackIgnore: true */ file);
  } finally {
    await handle.close().catch(() => undefined);
    await unlink(temporary).catch(() => undefined);
  }
}
