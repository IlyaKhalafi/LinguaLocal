import path from "node:path";
import { format } from "prettier";
import { levels, packSchema } from "../src/lib/schema";
import { selectLevelPack } from "../src/lib/pack-export";
import { readValidatedJson } from "../src/lib/json-file";
import { writeFileAtomically } from "../src/lib/atomic-file";
import { runCommand } from "../src/lib/cli";

runCommand(async () => {
  const root = path.resolve(__dirname, "..");
  const source = await readValidatedJson(
    path.join(root, "src/content/starter.json"),
    packSchema,
  );
  const rows: string[] = [];
  for (const level of levels) {
    const pack = selectLevelPack(source, level);
    const name = `${level.toLowerCase()}.json`;
    await writeFileAtomically(
      path.join(root, "examples/packs", name),
      await format(JSON.stringify(pack), { parser: "json" }),
    );
    rows.push(
      `| [${level}](${name}) | ${pack.words.length} | ${pack.books.length} | ${pack.lessons.length} |`,
    );
  }
  await writeFileAtomically(
    path.join(root, "examples/packs/README.md"),
    await format(
      `# Original curriculum packs

Choose a starting collection for your class. Each pack includes original vocabulary, book shells, and short lessons. Level labels guide practice rather than certify proficiency.

| Pack | Words | Books | Lessons |
| ---- | ----- | ----- | ------- |
${rows.join("\n")}

Download a JSON file, keep the IDs stable when editing it, and follow the [content guide](../../docs/CONTENT.md) to validate and install it. Installing a pack replaces the school's shared collection. Keep a server snapshot first if you want to return to it.

Some lessons reference vocabulary from another level. Those words are included so every lesson remains complete. Media files travel separately. The original sample media referenced here is bundled with LinguaLocal. Custom recordings, videos, captions, and PDFs need matching files in the school's media directory.

The packs use the project's [MIT license](../../LICENSE). Rebuild them from the starter collection with \`npm run content:gallery\`. Export your own level collection with \`npm run content:export -- collection.json new-a2.json A2\`. Export never overwrites an existing destination or installs a pack.
`,
      { parser: "markdown" },
    ),
  );
});
