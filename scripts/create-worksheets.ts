import "./load-environment.mjs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { levels, packSchema } from "../src/lib/schema";
import { readValidatedJson } from "../src/lib/json-file";
import { writeFileAtomically } from "../src/lib/atomic-file";
import { createWorksheets } from "../src/lib/worksheets";
import { runCommand } from "../src/lib/cli";

runCommand(async () => {
  const [source, destination, selection] = process.argv.slice(2);
  if (!source || !destination || process.argv.length > 5)
    throw new Error(
      "Usage is create-worksheets INPUT.json NEW-DIRECTORY [LEVEL]",
    );
  const level =
    selection === undefined ? undefined : z.enum(levels).parse(selection);
  const { files, skipped } = createWorksheets(
    await readValidatedJson(source, packSchema),
    level,
  );
  await mkdir(path.dirname(path.resolve(destination)), { recursive: true });
  await mkdir(destination);
  try {
    for (const file of files)
      await writeFileAtomically(path.join(destination, file.name), file.html, {
        overwrite: false,
      });
  } catch (error) {
    await rm(destination, { recursive: true, force: true });
    throw error;
  }
  console.log(
    `Created ${files.length} printable files in ${destination}. Open index.html to choose a worksheet.`,
  );
  if (skipped)
    console.log(
      `Skipped ${skipped} entries with repeated headwords or meanings.`,
    );
});
