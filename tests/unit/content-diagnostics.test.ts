import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import seed from "../../src/content/starter.json";
import { packSchema } from "../../src/lib/schema";
import { diagnoseContent } from "../../src/lib/content-diagnostics";

test("media diagnostics agree with playback roots and preserve unused files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "lingualocal-diagnostics-"));
  try {
    const media = path.join(root, "media"),
      demo = path.join(root, "demo");
    await mkdir(path.join(media, "unit"), { recursive: true });
    await mkdir(demo);
    await writeFile(path.join(media, "unit/track.wav"), "audio");
    await writeFile(path.join(media, "unused.mp3"), "spare");
    await symlink(
      path.join(media, "unit/track.wav"),
      path.join(media, "alias.wav"),
    );
    await writeFile(path.join(media, "empty.vtt"), "");
    await symlink("loop.wav", path.join(media, "loop.wav"));
    await writeFile(path.join(demo, "film.mp4"), "video");
    await writeFile(path.join(root, "outside.pdf"), "outside");
    await symlink(
      path.join(root, "outside.pdf"),
      path.join(media, "outside.pdf"),
    );
    const pack = packSchema.parse(seed);
    pack.books = [
      {
        ...pack.books[0],
        resources: [
          {
            id: "loop",
            title: "Loop",
            kind: "audio",
            file: "loop.wav",
            unit: "Unit 1",
            duration: "",
          },
          {
            id: "track",
            title: "Track",
            kind: "audio",
            file: "alias.wav",
            unit: "Unit 1",
            duration: "",
          },
          {
            id: "film",
            title: "Film",
            kind: "video",
            file: "film.mp4",
            captions: "empty.vtt",
            unit: "Unit 1",
            duration: "",
          },
          {
            id: "missing",
            title: "Missing",
            kind: "pdf",
            file: "missing.pdf",
            unit: "Unit 1",
            duration: "",
          },
          {
            id: "outside",
            title: "Outside",
            kind: "pdf",
            file: "outside.pdf",
            unit: "Unit 1",
            duration: "",
          },
        ],
      },
    ];
    const report = await diagnoseContent(pack, media, demo);
    assert.deepEqual(report.missing, ["missing.pdf", "outside.pdf"]);
    assert.deepEqual(report.empty, ["empty.vtt"]);
    assert.deepEqual(report.bundled, ["film.mp4"]);
    assert.deepEqual(report.unused, ["unused.mp3"]);
    assert.deepEqual(report.skipped, ["alias.wav", "loop.wav", "outside.pdf"]);
    assert.equal(report.storedFiles, 3);
    assert.equal(report.storedBytes, 10);
    assert.equal(report.referencedFiles, 6);
    assert.deepEqual(report.errors, [{ file: "loop.wav", code: "ELOOP" }]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("diagnostics support a fresh server with only bundled media", async () => {
  const root = await mkdtemp(
    path.join(tmpdir(), "lingualocal-diagnostics-empty-"),
  );
  try {
    const report = await diagnoseContent(
      packSchema.parse(seed),
      path.join(root, "absent"),
      path.resolve("public/demo"),
    );
    assert.deepEqual(report.missing, []);
    assert.deepEqual(report.empty, []);
    assert.equal(report.storedFiles, 0);
    assert.equal(report.bundled.length, report.referencedFiles);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
