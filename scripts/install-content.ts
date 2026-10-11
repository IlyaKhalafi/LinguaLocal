import "./load-environment.mjs";
import path from "node:path";
import { storagePaths } from "./storage-paths.mjs";
import { packSchema } from "../src/lib/schema";
import { readValidatedJson, writeJsonAtomically } from "../src/lib/json-file";
import { runCommand } from "../src/lib/cli";

async function install() {
  const source = process.argv[2];
  if (!source || process.argv.length !== 3)
    throw new Error("Usage is install-content PATH-TO-PACK.json");
  const content = await readValidatedJson(source, packSchema);
  const { dataDirectory } = storagePaths();
  await writeJsonAtomically(path.join(dataDirectory, "content.json"), content);
  console.log(
    `Installed ${content.books.length} books, ${content.words.length} words, and ${content.lessons.length} lessons.`,
  );
}

runCommand(install);
