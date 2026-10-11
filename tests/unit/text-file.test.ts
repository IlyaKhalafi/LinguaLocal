import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readUtf8File } from "../../src/lib/text-file";

test("UTF-8 school files preserve local scripts, accept BOM and reject broken bytes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "lingualocal-text-"));
  try {
    const file = path.join(directory, "text.txt");
    await writeFile(file, "\ufeffفارسی العربية Türkçe");
    assert.equal(await readUtf8File(file), "فارسی العربية Türkçe");
    await assert.rejects(readUtf8File(file, { limit: 4 }), /size limit/);
    await writeFile(file, Buffer.from([0xff, 0xfe, 0x41]));
    await assert.rejects(readUtf8File(file), /UTF-8/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("text readers reject special files without reading unlimited input", async () => {
  await assert.rejects(readUtf8File("/dev/zero"), /regular file/);
});
