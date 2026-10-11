import "./load-environment.mjs";
import { z } from "zod";
import { levels, packSchema } from "../src/lib/schema";
import { selectLevelPack } from "../src/lib/pack-export";
import { readValidatedJson, writeJsonAtomically } from "../src/lib/json-file";
import { runCommand } from "../src/lib/cli";
import { DOCUMENT_LIMIT } from "../src/lib/document-limits";

runCommand(async () => {
  const [source, output, selection] = process.argv.slice(2);
  if (!source || !output || !selection || process.argv.length !== 5)
    throw new Error("Usage is export-content INPUT.json NEW.json LEVEL");
  const level = z.enum(levels).parse(selection);
  const pack = selectLevelPack(
    await readValidatedJson(source, packSchema),
    level,
  );
  await writeJsonAtomically(output, pack, {
    overwrite: false,
    pretty: true,
    limit: DOCUMENT_LIMIT,
  });
  console.log(
    `Created the ${level} pack with ${pack.words.length} words, ${pack.books.length} books, and ${pack.lessons.length} lessons. Media files travel separately.`,
  );
});
