import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  symlink,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import seed from "../../src/content/starter.json";
import { packSchema } from "../../src/lib/schema";
import { defaultSettings } from "../../src/lib/default-settings";
import {
  createServerSnapshot,
  restoreServerSnapshot,
} from "../../src/lib/server-snapshot";
import { writeJsonAtomically } from "../../src/lib/json-file";

test("server snapshots preserve defaults, unused media, settings and portable resource files", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "lingualocal-snapshot-"));
  try {
    const dataDirectory = path.join(directory, "school"),
      mediaDirectory = path.join(dataDirectory, "media"),
      bundledDirectory = path.resolve("public/demo");
    const content = packSchema.parse(seed),
      settings = { ...defaultSettings, name: "Northside School" };
    await mkdir(mediaDirectory, { recursive: true });
    await writeFile(
      path.join(mediaDirectory, "unused.txt"),
      "Keep this owner's source material.",
    );
    await writeJsonAtomically(path.join(dataDirectory, "settings.json"), {
      ...settings,
      futureField: "preserve this setting",
    });
    const snapshot = path.join(directory, "backup"),
      restored = path.join(directory, "restored");
    const report = await createServerSnapshot(
      { dataDirectory, mediaDirectory, bundledDirectory },
      snapshot,
      {
        content,
        settings: defaultSettings,
        server: {
          port: 3200,
          host: "0.0.0.0",
          publicUrl: "http://school.local:3200",
        },
      },
    );
    assert.equal(report.files, 7);
    assert.deepEqual(report.defaults, ["content.json"]);
    await restoreServerSnapshot(snapshot, restored);
    assert.ok(
      (
        await readFile(path.join(restored, "server.env.example"), "utf8")
      ).includes("PORT=3200"),
    );
    assert.deepEqual(
      JSON.parse(await readFile(path.join(restored, "content.json"), "utf8")),
      content,
    );
    assert.deepEqual(
      JSON.parse(await readFile(path.join(restored, "settings.json"), "utf8")),
      { ...settings, futureField: "preserve this setting" },
    );
    assert.equal(
      await readFile(path.join(restored, "media/unused.txt"), "utf8"),
      "Keep this owner's source material.",
    );
    assert.deepEqual(
      await readFile(path.join(restored, "media/greetings.mp4")),
      await readFile("public/demo/greetings.mp4"),
    );
    await assert.rejects(restoreServerSnapshot(snapshot, restored), {
      code: "EEXIST",
    });
    await assert.rejects(
      createServerSnapshot(
        { dataDirectory, mediaDirectory, bundledDirectory },
        snapshot,
        { content, settings },
      ),
      { code: "EEXIST" },
    );
    await assert.rejects(
      createServerSnapshot(
        { dataDirectory, mediaDirectory, bundledDirectory },
        path.join(mediaDirectory, "backup"),
        { content, settings },
      ),
      /outside/,
    );
    const manifest = JSON.parse(
      await readFile(path.join(snapshot, "snapshot.json"), "utf8"),
    );
    assert.ok(
      manifest.files.every(
        (file: { sha256: string }) => file.sha256.length === 64,
      ),
    );
    await writeFile(
      path.join(snapshot, "media/greetings.mp4"),
      "damaged video",
    );
    const refused = path.join(directory, "refused");
    await assert.rejects(restoreServerSnapshot(snapshot, refused), /checksum/);
    await assert.rejects(access(refused), { code: "ENOENT" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("snapshots refuse linked media, empty required files and invalid inventory", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "lingualocal-snapshot-invalid-"),
  );
  try {
    const roots = {
      dataDirectory: path.join(directory, "school"),
      mediaDirectory: path.join(directory, "media"),
      bundledDirectory: path.resolve("public/demo"),
    };
    const defaults = {
      content: packSchema.parse(seed),
      settings: defaultSettings,
    };
    await mkdir(roots.mediaDirectory);
    await writeFile(path.join(directory, "outside.mp4"), "outside");
    await symlink(
      path.join(directory, "outside.mp4"),
      path.join(roots.mediaDirectory, "link.mp4"),
    );
    await assert.rejects(
      createServerSnapshot(roots, path.join(directory, "backup"), defaults),
      /linked media/,
    );
    await rm(path.join(roots.mediaDirectory, "link.mp4"));
    await writeFile(path.join(roots.mediaDirectory, "greetings.mp4"), "");
    await assert.rejects(
      createServerSnapshot(roots, path.join(directory, "backup"), defaults),
      /missing or empty/,
    );
    const snapshot = path.join(directory, "malformed");
    await mkdir(snapshot);
    await writeJsonAtomically(path.join(snapshot, "snapshot.json"), {
      version: 1,
      created: new Date().toISOString(),
      files: [
        { file: "../outside.mp4", bytes: 7, sha256: "a".repeat(64) },
        { file: "settings.json", bytes: 1, sha256: "b".repeat(64) },
      ],
    });
    await assert.rejects(
      restoreServerSnapshot(snapshot, path.join(directory, "refused")),
    );
    await assert.rejects(access(path.join(directory, "refused")), {
      code: "ENOENT",
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
