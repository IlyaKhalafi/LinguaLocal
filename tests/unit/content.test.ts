import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { contentVersion } from "../../src/lib/content-version";

const directory = mkdtempSync(path.join(tmpdir(), "lingualocal-content-test-"));
process.env.LINGUALOCAL_DATA_DIR = directory;
const service = import("../../src/lib/content");
after(() => rm(directory, { recursive: true, force: true }));

test("content and settings use defaults before the first write", async () => {
  const api = await service;
  assert.equal((await api.getContent()).words.length, 24);
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
test("concurrent collection saves reject stale versions", async () => {
  const api = await service;
  const original = await api.getContent();
  const version = contentVersion(original);
  const first = structuredClone(original);
  first.books[0].title = "First edit";
  const second = structuredClone(original);
  second.books[0].title = "Second edit";
  const results = await Promise.allSettled([
    api.saveContent(first, version),
    api.saveContent(second, version),
  ]);
  assert.equal(results[0].status, "fulfilled");
  assert.equal(results[1].status, "rejected");
  assert.equal((await api.getContent()).books[0].title, "First edit");
});
