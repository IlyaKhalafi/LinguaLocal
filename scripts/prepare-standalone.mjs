import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import ts from "typescript";
import path from "node:path";
await mkdir(".next/standalone/.next", { recursive: true });
await cp(".next/static", ".next/standalone/.next/static", { recursive: true });
await cp("public", ".next/standalone/public", { recursive: true });
await mkdir(".next/standalone/scripts", { recursive: true });
await cp("node_modules/csv-parse", ".next/standalone/node_modules/csv-parse", {
  recursive: true,
});
const sources = [
  ["scripts/load-environment.mjs", "load-environment.mjs"],
  ["scripts/storage-paths.mjs", "storage-paths.mjs"],
  ["src/content/starter.json", "starter.json"],
  ["src/lib/network-address.ts", "network-address.mjs"],
  ["src/lib/server-config.ts", "server-config.mjs"],
  ["src/lib/default-settings.ts", "default-settings.mjs"],
  ["src/lib/server-snapshot.ts", "server-snapshot.mjs"],
  ["scripts/server-snapshot.ts", "snapshot-tools.mjs"],
  ["src/lib/schema.ts", "content-schema.mjs"],
  ["src/lib/atomic-file.ts", "atomic-file.mjs"],
  ["src/lib/document-limits.ts", "document-limits.mjs"],
  ["src/lib/text-file.ts", "text-file.mjs"],
  ["src/lib/subtitles.ts", "subtitles.mjs"],
  ["scripts/subtitles.ts", "subtitle-tools.mjs"],
  ["src/lib/json-file.ts", "json-file.mjs"],
  ["src/lib/cli.ts", "cli.mjs"],
  ["src/lib/media-files.ts", "media-files.mjs"],
  ["src/lib/content-diagnostics.ts", "content-diagnostics.mjs"],
  ["src/lib/vocabulary-csv.ts", "vocabulary-csv.mjs"],
  ["scripts/import-vocabulary.ts", "import-vocabulary.mjs"],
  ["scripts/diagnose-content.ts", "diagnose-content.mjs"],
  ["scripts/install-content.ts", "install-content.mjs"],
  ["scripts/validate-content.ts", "validate-content.mjs"],
];
const targets = new Map(
  sources.map(([source, target]) => [
    path.resolve(source.replace(/\.ts$/, "")),
    target,
  ]),
);
for (const [source, target] of sources) {
  const input = (await readFile(source, "utf8")).replace(
    /(["'])(\.{1,2}\/[^"']+)\1/g,
    (match, quote, specifier) => {
      const dependency = targets.get(
        path.resolve(path.dirname(source), specifier),
      );
      return dependency ? `${quote}./${dependency}${quote}` : match;
    },
  );
  if (source.endsWith(".json")) {
    await writeFile(`.next/standalone/scripts/${target}`, input);
    continue;
  }
  const { outputText } = ts.transpileModule(input, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  });
  await writeFile(`.next/standalone/scripts/${target}`, outputText);
}
