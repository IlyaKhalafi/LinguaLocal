import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import ts from "typescript";
await mkdir(".next/standalone/.next", { recursive: true });
await cp(".next/static", ".next/standalone/.next/static", { recursive: true });
await cp("public", ".next/standalone/public", { recursive: true });
await mkdir(".next/standalone/scripts", { recursive: true });
for (const [source, target] of [
  ["src/lib/schema.ts", "content-schema.mjs"],
  ["scripts/install-content.ts", "install-content.mjs"],
]) {
  const input = (await readFile(source, "utf8")).replace(
    '"../src/lib/schema"',
    '"./content-schema.mjs"',
  );
  const { outputText } = ts.transpileModule(input, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  });
  await writeFile(`.next/standalone/scripts/${target}`, outputText);
}
