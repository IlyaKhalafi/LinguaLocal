import path from "node:path";
import { packSchema } from "../src/lib/schema";
import { readValidatedJson, writeJsonAtomically } from "../src/lib/json-file";

async function install() {
  const source = process.argv[2];
  if (!source || process.argv.length !== 3)
    throw new Error("Usage is install-content PATH-TO-PACK.json");
  const content = await readValidatedJson(source, packSchema);
  const directory = path.resolve(process.env.LINGUALOCAL_DATA_DIR || "data");
  await writeJsonAtomically(path.join(directory, "content.json"), content);
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
