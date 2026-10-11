import { readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import type { ContentPack } from "./schema";
import { resolveMediaFile } from "./media-files";

type FileError = { file: string; code: string };
function fileError(file: string, error: unknown): FileError {
  return { file, code: (error as NodeJS.ErrnoException).code || "UNAVAILABLE" };
}

async function inventory(root: string) {
  const files: { name: string; bytes: number }[] = [];
  const skipped: string[] = [];
  const errors: FileError[] = [];
  const folders = [""];
  while (folders.length) {
    const folder = folders.pop()!;
    let entries;
    try {
      entries = await readdir(path.join(root, folder), { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT" && !folder)
        continue;
      errors.push(fileError(folder || ".", error));
      continue;
    }
    for (const entry of entries) {
      const name = path.posix.join(folder, entry.name);
      if (entry.isDirectory()) folders.push(name);
      else if (entry.isFile()) {
        try {
          files.push({ name, bytes: (await stat(path.join(root, name))).size });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT")
            errors.push(fileError(name, error));
        }
      } else skipped.push(name);
    }
  }
  return { files, skipped: skipped.sort(), errors };
}

export async function diagnoseContent(
  content: ContentPack,
  mediaRoot: string,
  fallbackRoot: string,
) {
  const references = [
    ...new Set(
      content.books.flatMap((book) =>
        book.resources.flatMap((resource) => [
          resource.file,
          ...(resource.captions ? [resource.captions] : []),
        ]),
      ),
    ),
  ].sort();
  const realMediaRoot = await realpath(mediaRoot).catch(() =>
    path.resolve(mediaRoot),
  );
  const errors: FileError[] = [];
  const used = new Set(references);
  const missing: string[] = [],
    empty: string[] = [],
    bundled: string[] = [];
  // Limit concurrent filesystem requests even for large school collections.
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(8, references.length) }, async () => {
      while (cursor < references.length) {
        const name = references[cursor++];
        try {
          const local = await resolveMediaFile(name.split("/"), [mediaRoot]);
          if (local)
            used.add(
              path
                .relative(realMediaRoot, local.file)
                .split(path.sep)
                .join("/"),
            );
          const found =
            local ?? (await resolveMediaFile(name.split("/"), [fallbackRoot]));
          if (!found) missing.push(name);
          else {
            if (!found.info.size) empty.push(name);
            if (!local) bundled.push(name);
          }
        } catch (error) {
          errors.push(fileError(name, error));
        }
      }
    }),
  );
  const {
    files,
    skipped,
    errors: inventoryErrors,
  } = await inventory(mediaRoot);
  return {
    books: content.books.length,
    words: content.words.length,
    lessons: content.lessons.length,
    referencedFiles: references.length,
    storedFiles: files.length,
    storedBytes: files.reduce((total, file) => total + file.bytes, 0),
    missing: missing.sort(),
    empty: empty.sort(),
    bundled: bundled.sort(),
    unused: files
      .filter((file) => !used.has(file.name))
      .map((file) => file.name)
      .sort(),
    skipped,
    errors: [...errors, ...inventoryErrors].sort((a, b) =>
      a.file.localeCompare(b.file),
    ),
  };
}
