import "./load-environment.mjs";
import { mkdir, rm, realpath, stat } from "node:fs/promises";
import path from "node:path";
import {
  studyReportSchema,
  classroomCsv,
  classroomHtml,
} from "../src/lib/study-report";
import { readValidatedJson } from "../src/lib/json-file";
import { writeFileAtomically } from "../src/lib/atomic-file";
import { locales, type Locale } from "../src/lib/locale";
import { runCommand } from "../src/lib/cli";

runCommand(async () => {
  const args = process.argv.slice(2);
  const languageFlag = args[0]?.startsWith("--language=")
    ? args.shift()
    : undefined;
  const language = (languageFlag?.slice("--language=".length) ??
    "en") as Locale;
  if (!locales.includes(language))
    throw new Error("Choose en, fa, ar or tr for --language.");
  const [destination, ...files] = args;
  if (
    !destination ||
    !files.length ||
    files.length > 200 ||
    new Set(files.map((file) => path.resolve(file))).size !== files.length
  )
    throw new Error(
      "Usage is combine-reports [--language=en|fa|ar|tr] NEW-DIRECTORY REPORT.json [REPORT.json ...]. Choose up to 200 distinct files.",
    );
  const reports = [];
  const paths = new Set<string>();
  const identities = new Set<string>();
  for (const file of files) {
    try {
      const absolute = await realpath(file);
      const normalized =
        process.platform === "win32" ? absolute.toLowerCase() : absolute;
      const info = await stat(file, { bigint: true });
      const identity = info.ino === 0n ? undefined : `${info.dev}:${info.ino}`;
      if (paths.has(normalized) || (identity && identities.has(identity)))
        throw new Error("This summary file was already selected.");
      paths.add(normalized);
      if (identity) identities.add(identity);
      reports.push(
        await readValidatedJson(file, studyReportSchema, 256 * 1024),
      );
    } catch (error) {
      throw new Error(`Unable to read student summary ${file}`, {
        cause: error,
      });
    }
  }
  const csv = classroomCsv(reports);
  const html = classroomHtml(reports, language);
  await mkdir(path.dirname(path.resolve(destination)), { recursive: true });
  await mkdir(destination);
  try {
    await writeFileAtomically(path.join(destination, "classroom.csv"), csv, {
      overwrite: false,
    });
    await writeFileAtomically(path.join(destination, "index.html"), html, {
      overwrite: false,
    });
  } catch (error) {
    await rm(destination, { recursive: true, force: true });
    throw error;
  }
  console.log(
    `Created ${destination}. Open index.html or classroom.csv to read the student-provided summaries.`,
  );
});
