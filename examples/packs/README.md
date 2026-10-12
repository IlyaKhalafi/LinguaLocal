# Original curriculum packs

Choose a starting collection for your class. Each pack includes original vocabulary, book shells, and short lessons. Level labels guide practice rather than certify proficiency.

| Pack          | Words | Books | Lessons |
| ------------- | ----- | ----- | ------- |
| [A1](a1.json) | 39    | 1     | 4       |
| [A2](a2.json) | 44    | 1     | 3       |
| [B1](b1.json) | 37    | 2     | 4       |
| [B2](b2.json) | 25    | 1     | 3       |
| [C1](c1.json) | 22    | 1     | 2       |

Download a JSON file, keep the IDs stable when editing it, and follow the [content guide](../../docs/CONTENT.md) to validate and install it. Installing a pack replaces the school's shared collection. Keep a server snapshot first if you want to return to it.

Some lessons reference vocabulary from another level. Those words are included so every lesson remains complete. Media files travel separately. The original sample media referenced here is bundled with LinguaLocal. Custom recordings, videos, captions, and PDFs need matching files in the school's media directory.

The packs use the project's [MIT license](../../LICENSE). Rebuild them from the starter collection with `npm run content:gallery`. Export your own level collection with `npm run content:export -- collection.json new-a2.json A2`. Export never overwrites an existing destination or installs a pack.
