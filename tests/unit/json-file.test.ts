import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import {
  readValidatedJson,
  writeJsonAtomically,
} from "../../src/lib/json-file";

test("atomic JSON replacement preserves the previous file when serialization fails", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "lingualocal-json-"));
  try {
    const file = path.join(directory, "data.json");
    await writeJsonAtomically(file, { value: 1 });
    await writeJsonAtomically(file, { value: 2 });
    assert.deepEqual(
      await readValidatedJson(file, z.object({ value: z.number() })),
      { value: 2 },
    );
    await assert.rejects(writeJsonAtomically(file, { value: BigInt(3) }));
    assert.equal(await readFile(file, "utf8"), '{"value":2}');
    assert.deepEqual(await readdir(directory), ["data.json"]);
    await assert.rejects(
      readValidatedJson(file, z.object({ value: z.number() }), 5),
      /size limit/,
    );
    await assert.rejects(
      readValidatedJson(file, z.object({ value: z.string() })),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("new JSON output never replaces an existing file and removes temporary files", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "lingualocal-json-new-"));
  try {
    const file = path.join(directory, "pack.json");
    await writeJsonAtomically(file, { original: true }, { overwrite: false });
    await assert.rejects(
      writeJsonAtomically(file, { replacement: true }, { overwrite: false }),
      (error: unknown) => (error as NodeJS.ErrnoException).code === "EEXIST",
    );
    assert.equal(await readFile(file, "utf8"), '{"original":true}');
    assert.deepEqual(await readdir(directory), ["pack.json"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
