import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import seed from "../../src/content/starter.json";

const directory = mkdtempSync(path.join(tmpdir(), "lingualocal-content-test-"));
process.env.LINGUALOCAL_DATA_DIR = directory;
const service = import("../../src/lib/content");
after(() => rm(directory, { recursive: true, force: true }));

test("content and settings use defaults before the first write", async () => {
  const api = await service;
  assert.deepEqual(await api.getContent(), seed);
  assert.equal((await api.getSettings()).name, "LinguaLocal");
});
test("writes persist and cached reads refresh after an edit", async () => {
  const api = await service;
  await api.atomicWrite("settings.json", {
    name: "First School",
    welcome: "Welcome",
  });
  const first = await api.getSettings();
  assert.strictEqual(first, await api.getSettings());
  await api.atomicWrite("settings.json", {
    name: "Second School",
    welcome: "Welcome",
  });
  assert.equal((await api.getSettings()).name, "Second School");
});
test("corrupt files remain recoverable without being overwritten", async () => {
  const api = await service;
  const location = path.join(directory, "settings.json");
  await writeFile(location, "broken file");
  await assert.rejects(api.getSettings(), /Unable to read/);
  const recovery = await api.getSettingsState();
  assert.equal(recovery.settings.name, "LinguaLocal");
  assert.ok(recovery.warning);
  assert.equal(await readFile(location, "utf8"), "broken file");
});
test("server content updates refresh the collection cache", async () => {
  const api = await service;
  const original = await api.getContent();
  const changed = structuredClone(original);
  changed.books[0].title = "Updated school book";
  await api.atomicWrite("content.json", changed);
  assert.equal((await api.getContent()).books[0].title, "Updated school book");
});

test("oversized server documents are rejected without being overwritten", async () => {
  const api = await service;
  const location = path.join(directory, "content.json");
  const original = await api.getContent();
  await writeFile(location, " ".repeat(2 * 1024 * 1024 + 1));
  await assert.rejects(api.getContent(), /Unable to read/);
  assert.equal((await readFile(location)).byteLength, 2 * 1024 * 1024 + 1);
  await api.atomicWrite("content.json", original);
});
