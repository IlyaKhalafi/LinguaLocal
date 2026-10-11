import "./load-environment.mjs";
import { packSchema } from "../src/lib/schema";
import { readValidatedJson } from "../src/lib/json-file";
import { runCommand } from "../src/lib/cli";

runCommand(async () => {
  const source = process.argv[2];
  if (!source || process.argv.length !== 3)
    throw new Error("Usage is validate-content PATH-TO-PACK.json");
  const content = await readValidatedJson(source, packSchema);
  console.log(
    `Valid pack with ${content.books.length} books, ${content.words.length} words, and ${content.lessons.length} lessons.`,
  );
});
