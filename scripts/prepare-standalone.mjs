import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import ts from "typescript";
import path from "node:path";
await mkdir(".next/standalone/.next", { recursive: true });
await cp(".next/static", ".next/standalone/.next/static", { recursive: true });
await cp("public", ".next/standalone/public", { recursive: true });
await mkdir(".next/standalone/scripts", { recursive: true });
const sources = [
  ["scripts/storage-paths.mjs", "storage-paths.mjs"],
  ["src/lib/schema.ts", "content-schema.mjs"],
  ["src/lib/json-file.ts", "json-file.mjs"],
  ["src/lib/cli.ts", "cli.mjs"],
  ["src/lib/media-files.ts", "media-files.mjs"],
  ["src/lib/content-diagnostics.ts", "content-diagnostics.mjs"],
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
  const { outputText } = ts.transpileModule(input, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  });
  await writeFile(`.next/standalone/scripts/${target}`, outputText);
}
