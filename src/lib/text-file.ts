import { open } from "node:fs/promises";
import { DOCUMENT_LIMIT } from "./document-limits";

export async function readUtf8File(
  file: string,
  {
    limit = DOCUMENT_LIMIT,
    label = "Text file",
  }: { limit?: number; label?: string } = {},
): Promise<string> {
  const handle = await open(/* turbopackIgnore: true */ file, "r");
  let bytes: Buffer;
  try {
    const info = await handle.stat();
    if (!info.isFile()) throw new Error(`${label} must be a regular file.`);
    if (info.size > limit) throw new Error(`${label} exceeds the size limit.`);
    const buffer = Buffer.alloc(limit + 1);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        size,
        buffer.length - size,
        null,
      );
      if (!bytesRead) break;
      size += bytesRead;
    }
    if (size > limit) throw new Error(`${label} exceeds the size limit.`);
    bytes = buffer.subarray(0, size);
  } finally {
    await handle.close();
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label} must use UTF-8 encoding.`);
  }
}
