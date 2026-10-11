import "./load-environment.mjs";
import { readUtf8File } from "../src/lib/text-file";
import { packSchema } from "../src/lib/schema";
import { importVocabulary } from "../src/lib/vocabulary-csv";
import { readValidatedJson, writeJsonAtomically } from "../src/lib/json-file";
import { runCommand } from "../src/lib/cli";

runCommand(async () => {
  const [source, output, basePath] = process.argv.slice(2);
  if (!source || !output || process.argv.length > 5)
    throw new Error(
      "Usage is import-vocabulary INPUT.csv OUTPUT.json [BASE.json]",
    );
  const csv = await readUtf8File(source, { label: "CSV file" });
  const base = basePath
    ? await readValidatedJson(basePath, packSchema)
    : undefined;
  const content = importVocabulary(csv, base);
  await writeJsonAtomically(output, content, { overwrite: false });
  const previous = new Map(base?.words.map((word) => [word.id, word]) ?? []);
  const updated = content.words.filter(
    (word) =>
      previous.has(word.id) &&
      JSON.stringify(previous.get(word.id)) !== JSON.stringify(word),
  ).length;
  console.log(
    `Created a pack with ${content.words.length} words. Updated ${updated} existing words in the output. Validate and install it when ready.`,
  );
});
