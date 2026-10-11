import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { packSchema } from "../src/lib/schema";

async function install() {
  const source = process.argv[2];
  if (!source || process.argv.length !== 3)
    throw new Error("Usage is install-content PATH-TO-PACK.json");
  const info = await stat(source);
  if (info.size > 2 * 1024 * 1024)
    throw new Error("Content packs must be smaller than 2 MB.");
  const content = packSchema.parse(JSON.parse(await readFile(source, "utf8")));
  const directory = path.resolve(process.env.LINGUALOCAL_DATA_DIR || "data");
  await mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `content.${randomUUID()}.tmp`);
  const handle = await open(temporary, "wx");
  try {
    await handle.writeFile(JSON.stringify(content));
    await handle.sync();
    await handle.close();
    await rename(temporary, path.join(directory, "content.json"));
  } finally {
    await handle.close().catch(() => undefined);
    await unlink(temporary).catch(() => undefined);
  }
  console.log(
    `Installed ${content.books.length} books, ${content.words.length} words, and ${content.lessons.length} lessons.`,
  );
}

install().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Unable to install content.",
  );
  process.exitCode = 1;
});
