import "./load-environment.mjs";
import { z } from "zod";
import { levels, packSchema } from "../src/lib/schema";
import { readValidatedJson } from "../src/lib/json-file";
import { writeFileAtomically } from "../src/lib/atomic-file";
import { exportVocabulary } from "../src/lib/vocabulary-export";
import { runCommand } from "../src/lib/cli";

runCommand(async () => {
  const [source, output, selectedLevel] = process.argv.slice(2);
  if (!source || !output || process.argv.length > 5)
    throw new Error("Usage is export-vocabulary INPUT.json NEW.csv [LEVEL]");
  const level =
    selectedLevel === undefined
      ? undefined
      : z.enum(levels).parse(selectedLevel);
  const content = await readValidatedJson(source, packSchema);
  const words = content.words.filter((word) => !level || word.level === level);
  const csv = exportVocabulary(words);
  await writeFileAtomically(output, csv, { overwrite: false });
  console.log(`Exported ${words.length} words to ${output}.`);
});
