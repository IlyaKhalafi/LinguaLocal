import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { serverConfig, configTemplate } from "../../src/lib/server-config";

test("server configuration archives only usable deployment fields", () => {
  const config = serverConfig({
    PORT: "3200",
    LINGUALOCAL_HOST: "0.0.0.0",
    LINGUALOCAL_PUBLIC_URL: "http://school.local:3200",
    UNRELATED_VALUE: "never archive this",
  });
  const template = configTemplate(config);
  assert.ok(template.includes("PORT=3200"));
  assert.ok(
    template.includes("LINGUALOCAL_PUBLIC_URL=http://school.local:3200"),
  );
  assert.ok(!template.includes("UNRELATED_VALUE"));
  assert.throws(() => serverConfig({ PORT: "0" }));
  assert.throws(() => serverConfig({ LINGUALOCAL_HOST: "host\nPORT=12" }));
  assert.throws(() =>
    serverConfig({ LINGUALOCAL_PUBLIC_URL: "http://localhost:3000" }),
  );
});

test("owner commands load the local environment and respect exported overrides", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "lingualocal-env-"));
  try {
    await writeFile(
      path.join(directory, ".env"),
      "LINGUALOCAL_ENV_TEST=from-file\n",
    );
    const moduleUrl = pathToFileURL(
      path.resolve("scripts/load-environment.mjs"),
    ).href;
    const run = (override?: string) => {
      const env = { ...process.env };
      delete env.LINGUALOCAL_ENV_TEST;
      if (override) env.LINGUALOCAL_ENV_TEST = override;
      const result = spawnSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `import ${JSON.stringify(moduleUrl)}; console.log(process.env.LINGUALOCAL_ENV_TEST)`,
        ],
        { cwd: directory, env, encoding: "utf8" },
      );
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim();
    };
    assert.equal(run(), "from-file");
    assert.equal(run("exported"), "exported");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
