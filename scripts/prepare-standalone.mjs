import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import ts from "typescript";
await mkdir(".next/standalone/.next", { recursive: true });
await cp(".next/static", ".next/standalone/.next/static", { recursive: true });
await cp("public", ".next/standalone/public", { recursive: true });
await mkdir(".next/standalone/scripts", { recursive: true });
for (const [source, target] of [
  ["src/lib/schema.ts", "content-schema.mjs"],
  ["src/lib/json-file.ts", "json-file.mjs"],
  ["src/lib/cli.ts", "cli.mjs"],
  ["scripts/install-content.ts", "install-content.mjs"],
  ["scripts/validate-content.ts", "validate-content.mjs"],
]) {
  const input = (await readFile(source, "utf8"))
    .replace('"../src/lib/schema"', '"./content-schema.mjs"')
    .replace('"../src/lib/json-file"', '"./json-file.mjs"')
    .replace('"../src/lib/cli"', '"./cli.mjs"');
  const { outputText } = ts.transpileModule(input, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  });
  await writeFile(`.next/standalone/scripts/${target}`, outputText);
}
