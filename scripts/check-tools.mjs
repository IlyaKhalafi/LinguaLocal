import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const directory = await mkdtemp(path.join(tmpdir(), "lingualocal-tools-"));
const dataDirectory = path.join(directory, "school");
const output = path.join(directory, "collection.json");
function run(name, args, expected = 0) {
  const result = spawnSync(
    process.execPath,
    [`.next/standalone/scripts/${name}.mjs`, ...args],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        LINGUALOCAL_DATA_DIR: dataDirectory,
        LINGUALOCAL_MEDIA_DIR: path.join(dataDirectory, "media"),
      },
    },
  );
  if (result.error) throw result.error;
  assert.equal(result.status, expected, result.stderr || result.stdout);
  return result.stdout;
}
try {
  run("import-vocabulary", [
    "examples/vocabulary.csv",
    output,
    "src/content/starter.json",
  ]);
  const original = await readFile(output, "utf8");
  run("validate-content", [output]);
  const worksheets = path.join(directory, "worksheets");
  run("create-worksheets", [output, worksheets, "A1"]);
  const lessonSheet = await readFile(
    path.join(worksheets, "lessons.html"),
    "utf8",
  );
  assert.ok(lessonSheet.includes("Check your understanding"));
  assert.ok(
    (await readFile(path.join(worksheets, "answers.html"), "utf8")).includes(
      "Answer key",
    ),
  );
  run("create-worksheets", [output, worksheets, "A1"], 1);
  assert.equal(
    await readFile(path.join(worksheets, "lessons.html"), "utf8"),
    lessonSheet,
  );
  run(
    "create-worksheets",
    [output, path.join(directory, "invalid-worksheets"), "D2"],
    1,
  );
  const csvOutput = path.join(directory, "vocabulary.csv");
  run("export-vocabulary", [output, csvOutput]);
  const exportedCsv = await readFile(csvOutput, "utf8");
  const roundTrip = path.join(directory, "round-trip.json");
  run("import-vocabulary", [csvOutput, roundTrip, output]);
  assert.deepEqual(
    JSON.parse(await readFile(roundTrip, "utf8")),
    JSON.parse(original),
  );
  run("export-vocabulary", [output, csvOutput], 1);
  assert.equal(await readFile(csvOutput, "utf8"), exportedCsv);
  const a2Csv = path.join(directory, "a2.csv");
  run("export-vocabulary", [output, a2Csv, "A2"]);
  const a2Vocabulary = path.join(directory, "a2-vocabulary.json");
  run("import-vocabulary", [a2Csv, a2Vocabulary]);
  assert.ok(
    JSON.parse(await readFile(a2Vocabulary, "utf8")).words.every(
      (word) => word.level === "A2",
    ),
  );
  run("export-vocabulary", [output, a2Csv, "D2"], 1);
  const levelPack = path.join(directory, "a2.json");
  run("export-content", [output, levelPack, "A2"]);
  const levelContent = JSON.parse(await readFile(levelPack, "utf8"));
  assert.ok(levelContent.books.every((book) => book.level === "A2"));
  assert.ok(levelContent.lessons.every((lesson) => lesson.level === "A2"));
  run("validate-content", [levelPack]);
  run("export-content", [output, levelPack, "A2"], 1);
  assert.deepEqual(JSON.parse(await readFile(levelPack, "utf8")), levelContent);
  run(
    "export-content",
    [output, path.join(directory, "invalid.json"), "D2"],
    1,
  );
  run(
    "import-vocabulary",
    ["examples/vocabulary.csv", output, "src/content/starter.json"],
    1,
  );
  assert.equal(await readFile(output, "utf8"), original);
  run("install-content", [output]);
  assert.deepEqual(
    JSON.parse(
      await readFile(path.join(dataDirectory, "content.json"), "utf8"),
    ),
    JSON.parse(original),
  );
  const report = JSON.parse(run("diagnose-content", [output]));
  assert.deepEqual(report.missing, []);
  assert.deepEqual(report.errors, []);
  const captions = path.join(directory, "captions.vtt");
  run("subtitle-tools", ["convert", "examples/captions.srt", captions]);
  const captionReport = JSON.parse(run("subtitle-tools", ["check", captions]));
  assert.equal(captionReport.cues, 2);
  assert.deepEqual(captionReport.warnings, []);
  run("subtitle-tools", ["convert", "examples/captions.srt", captions], 1);
  const snapshot = path.join(directory, "snapshot");
  const restored = path.join(directory, "restored");
  run("snapshot-tools", ["create", snapshot]);
  run("snapshot-tools", ["restore", snapshot, restored]);
  assert.ok(
    (
      await readFile(path.join(restored, "server.env.example"), "utf8")
    ).includes("PORT="),
  );
  assert.equal(
    await readFile(path.join(restored, "content.json"), "utf8"),
    await readFile(path.join(dataDirectory, "content.json"), "utf8"),
  );
  run("snapshot-tools", ["restore", snapshot, restored], 1);
  run("import-vocabulary", [], 1);
  console.log("Packaged content tools passed.");
} finally {
  await rm(directory, { recursive: true, force: true });
}
