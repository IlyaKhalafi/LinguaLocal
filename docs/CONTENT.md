# Bring your own curriculum

Owners manage shared content on the school server. The browser hub has no content editor, upload form, or shared write endpoints. Students need no accounts.

## Installing a content pack

Copy `src/content/starter.json` to a working JSON file. Edit books, vocabulary, and lessons using the examples below. Keep a backup of the previous collection.

Run `npx tsx scripts/install-content.ts /path/to/collection.json` from the project directory. The command validates the whole pack before replacing `data/content.json`. `LINGUALOCAL_DATA_DIR` selects a different data directory. Updates appear on the next page load.

For Docker, edit a local pack and copy it into the running container, then validate and install it.

```sh
docker compose cp collection.json lingualocal:/tmp/collection.json
docker compose exec lingualocal node scripts/install-content.mjs /tmp/collection.json
```

The packaged installer is generated during the build and uses the same schema as the app.

School branding is stored in `data/settings.json` with `name` and `welcome` fields. Both must be nonempty, with limits of 60 and 180 characters. Remove the file to restore defaults.

Packs must be smaller than 2 MB and contain at least four words. Validation rules are in `src/lib/schema.ts`. Keep entry IDs stable to preserve student bookmarks and reviews.

Validate a pack without installing it using `npm run content:validate -- collection.json`. The command reports the exact field for invalid values and exits unsuccessfully. In Docker, use `node scripts/validate-content.mjs /tmp/collection.json`. Validation never changes school files.

### Dictionary entries

```json
{
  "id": "curious",
  "word": "curious",
  "phonetic": "/ˈkjʊəriəs/",
  "part": "adjective",
  "definition": "Eager to know or learn something.",
  "example": "Stay curious and ask one more question.",
  "level": "A2",
  "synonyms": ["inquisitive", "interested"]
}
```

Use unique, stable IDs made from lowercase letters, numbers, and hyphens. Keep IDs unchanged when correcting an entry so bookmarks and reviews still refer to it. Supported levels are A1, A2, B1, B2, and C1.

Quiz and matching rounds use distinct headwords and meanings so students do not face indistinguishable choices. If an imported collection repeats either, games use the first distinct entry. Dictionary and flashcards retain every entry. A game needs at least four distinct words in its selected pool.

### Importing a vocabulary spreadsheet

Export a UTF-8 CSV from your spreadsheet with `id`, `word`, `part`, `definition`, `example`, and `level` columns. Optional `phonetic` and `synonyms` columns are supported. Separate synonyms with `|` inside the cell. Comma and semicolon separators are detected automatically. Quoted commas, line breaks, and spreadsheet byte-order marks are accepted. Invalid records report their CSV line and field.

[Download the example spreadsheet](../examples/vocabulary.csv).

Run `npm run vocabulary:import -- words.csv new-collection.json collection.json` to merge vocabulary into an existing pack. Matching IDs update that word in the new output. The command reports how many existing words changed. The base collection stays intact, duplicate CSV IDs are rejected, and the output must be a new file. Omit the base path to create a vocabulary-only pack with at least four words.

In Docker, use `node scripts/import-vocabulary.mjs /tmp/words.csv /tmp/new-collection.json /tmp/collection.json`. Validate the output before installing it. The input and resulting pack each have a 2 MB limit.

### Exporting vocabulary

Run `npm run vocabulary:export -- collection.json new-words.csv` to export every dictionary entry. Add a level such as `B1` to export only that level. The UTF-8 file opens in spreadsheets and preserves non-Latin text, quotes, and multiline examples. The source stays intact and the destination must be a new file.

Exports include an `encoding` column identifying the reversible LinguaLocal format. Keep this column when reimporting. Synonyms are stored as JSON arrays so literal `|` characters survive. Formula-like cells and leading apostrophes receive a protective apostrophe that import removes. Existing plain CSV files continue to use pipe-separated synonyms.

Import the CSV with the original collection as the base to retain books, lessons, and entries outside the exported level. A standalone vocabulary pack still needs at least four words. CSV exports have the same 2 MB size limit as imports.

In Docker, use `node scripts/export-vocabulary.mjs /tmp/collection.json /tmp/new-words.csv B1`.

### Creating printable classroom materials

Run `npm run worksheets:create -- collection.json new-worksheets A1` to generate vocabulary and lesson worksheets for a level. Omit the level to include the full collection. Open `new-worksheets/index.html` to choose a file and print it, or save it as a PDF from the browser. Answer keys are kept in a separate file.

Vocabulary worksheets group up to eight words and adjust for longer definitions. Matching sheets use distinct headwords and meanings. The command reports repeated entries it skips. Lesson sheets preserve reading sections and offer the original practice question. Questions and their options stay together when they fit on a page. Long text continues onto later pages.

The destination must be a new directory. Existing directories and the source collection stay intact. The output uses bundled CSS and system fonts and can be opened without a server or network connection. Printed classroom labels are in English. Browser interface language preferences do not change these files.

In Docker, use `node scripts/create-worksheets.mjs /tmp/collection.json /tmp/new-worksheets A1`, then copy the directory out of the container.

### Book resources

```json
{
  "id": "unit-one-listening",
  "title": "A new beginning",
  "kind": "audio",
  "file": "everyday-english/unit-1/track-01.mp3",
  "duration": "2:30",
  "unit": "Unit 1",
  "transcript": "Hello! Welcome to your English class."
}
```

File paths are relative to the media directory and use forward slashes. Absolute paths and external URLs are not accepted. Resource IDs must be unique within each book.

Audio formats are MP3, WAV, OGG, M4A, and FLAC. Video formats are MP4 and WebM. Reading files use PDF. Browser codec support applies. MP3 audio and H.264 MP4 video work across most devices.

For video, add a `captions` field containing a relative `.vtt` path. Duration text is entered by the content author and displayed as supplied.

### Converting and checking captions

Save subtitles as UTF-8. Run `npm run subtitles:convert -- captions.srt captions.vtt` to convert SubRip captions to WebVTT. Millisecond timing, line breaks, and text formatting are preserved. Converted SubRip cues are ordered by start time. The output must be a new file.

Run `npm run subtitles:check -- captions.vtt` to check cue timing and report overlaps, out-of-order cues, and long captions that may wrap on phones. The report includes the cue count and total duration. Overlapping captions can be intentional when speakers overlap, so they are reported as warnings. Invalid timing or empty cue text stops conversion.

The packaged commands are `node scripts/subtitle-tools.mjs convert INPUT.srt OUTPUT.vtt` and `node scripts/subtitle-tools.mjs check INPUT.vtt`. Files are limited to 2 MB and 20,000 cues. Existing WebVTT comments, styles, and positioning settings stay intact when normalizing a WebVTT file.

[Download example captions](../examples/captions.srt).

Timed transcripts also support short dictation sessions. The player uses up to five caption cues containing at most 120 words, 2,000 characters, and 60 seconds each. Empty and longer cues stay readable in the transcript. Plain transcripts without timing remain available for reading. Sentence capitalization and punctuation are ignored during checking, while contractions and word spelling count.

### Lessons

Each lesson has a title, description, level, category, reading time, and text sections. Its practice question contains two to six options, a zero-based correct answer index, and an explanation. Categories are Grammar, Vocabulary, Reading, Speaking, and Writing.

### Choosing or exporting a level pack

The [original pack gallery](../examples/packs/README.md) offers A1, A2, B1, B2, and C1 collections. Each uses the same validated format as the full starter pack. Download a pack and edit a working copy before installing it.

Run `npm run content:export -- collection.json new-b1.json B1` to extract a level from any valid collection. The source stays intact and the output must be a new file. Books and lessons match the selected level. Vocabulary includes that level and any other words referenced by its lessons. An export still needs at least four dictionary entries. Exports include the documented version 1 fields. Use a snapshot to preserve additional custom JSON fields.

In Docker, use `node scripts/export-content.mjs /tmp/collection.json /tmp/new-b1.json B1`. Exported JSON contains resource paths. Copy the matching media separately, or use a server snapshot when moving the whole school collection.

## Media files

Copy files or folders into the server’s configured media directory. For Docker, use `docker compose cp` to place files under `/app/data/media`. Set matching relative paths in the content pack. Bundled demonstration files remain available as fallbacks.

Keep publisher materials out of the public repository. Schools should supply files they own or have permission to distribute. The original starter collection is included with the project.

## Checking media and storage

Run `npm run content:diagnose -- collection.json` to check every referenced audio, video, PDF, and caption file. The JSON report lists missing files, empty files, bundled fallbacks, unused media, and total media storage. Missing, empty, or unreadable resources make the command exit unsuccessfully. File errors appear in the report while other references continue to be checked. Unused files are reported without deleting them.

The command uses the same media resolution rules as playback. It checks `LINGUALOCAL_MEDIA_DIR`, or the data directory's `media` folder, before bundled samples. Directory symlinks are not followed during storage inventory and appear under `skipped`.

In Docker, use `node scripts/diagnose-content.mjs /tmp/collection.json` after copying your pack into the container.

## Migrating from the Python app

Copy the old app’s audio folders into the new media directory. Create books and connect tracks using their relative paths. The previous lesson, quiz, and dictionary models need conversion to the current pack format. There is no automatic migration command.

## Personal progress

Progress is exported from Settings. It contains saved words, personal word and lesson notes, lesson completions, review schedules, game attempts, activity dates, and a daily goal. Restore it in another browser to continue the same journey. Older backups remain supported.

Notes stay collapsed beside dictionary entries and below lessons. Each note supports up to 1,500 characters, with at most 500 notes per browser. Saving an empty note removes it. A draft stays intact when another tab changes the saved note, with a choice to reload or overwrite it. Notes do not change the school’s curriculum or leave the browser unless included in a progress export.

Shared computers use the same progress when they share a browser profile. Clearing browser storage removes progress. Save a backup first.

## Server snapshots

A snapshot includes school content, school settings, all regular files from the custom media directory, and bundled media referenced by the collection. Original JSON fields are preserved. It records SHA-256 checksums and reports which documents used starter defaults. Check the reported source directories before storing your backup.

```bash
npm run content:snapshot -- /backups/lingualocal-october
npm run content:restore -- /backups/lingualocal-october /srv/lingualocal-restored
```

Both destinations must be new directories. Restore verifies the inventory, required resources, and every checksum before creating the new data directory. It preserves the active collection. Restored media sits in `NEW-DATA-DIRECTORY/media`. Point `LINGUALOCAL_DATA_DIR` there and update `LINGUALOCAL_MEDIA_DIR` if you previously used a separate media location.

Pause content edits and file transfers while taking a snapshot. A changed source file fails the operation and removes its partial output. Move symbolic links into regular media files first. Snapshots keep unused media so source materials are not lost. Student browser progress is backed up separately from Settings.

In the standalone distribution, use `node scripts/snapshot-tools.mjs create NEW-SNAPSHOT-DIRECTORY` or `node scripts/snapshot-tools.mjs restore SNAPSHOT NEW-DATA-DIRECTORY`.

Content commands load the project’s `.env` file, with exported environment variables taking precedence. Snapshots also archive the configured `PORT`, `LINGUALOCAL_HOST`, and public school address. Restore produces `server.env.example` for you to review on the new computer. Set its data paths before copying these values into the deployment environment. Other environment variables are not included.

## Original vocabulary collections

The starter pack includes 150 entries across A1, A2, B1, B2, and C1. The everyday collection adds 66 words for home, school, travel, food, and conversations. The advanced collection adds 60 words for discussion, collaboration, decision-making, and critical reading. Each has an original definition, pronunciation, example, and related wording. Level labels guide practice rather than certify a learner's proficiency.

The source collections live in `src/content/vocabulary`. Rebuild the bundled pack with `python3 scripts/seed-content.py`, then validate it with `npm run content:validate -- src/content/starter.json`. Stable IDs keep saved words intact when the pack grows. School content files are never replaced by rebuilding the starter pack.

## Linked lesson vocabulary

The 16 included lessons cover grammar, vocabulary, reading, speaking, and writing from A1 to C1. New lessons live in `src/content/lessons.json` and are included when the starter pack is rebuilt.

A lesson can optionally include `wordIds` containing up to 200 unique dictionary IDs from the same pack. Validation rejects missing or repeated references. Older packs without this field continue to work. Keep lesson IDs stable to preserve completed lessons in student browsers.

After completing a lesson, students can review its linked words immediately. Cards follow the `wordIds` order and use the student's normal private review schedule. The next lesson follows collection order within the same CEFR level. Lessons without linked words still offer the next lesson. No learner account or shared editing is involved.

## Assignment links

Create a plan on the server using `examples/assignment.json`. Each task names a lesson, book, or dictionary word by its existing ID. A plan has up to 20 unique tasks and an optional `due` date in `YYYY-MM-DD` form.

```sh
npm run assignment:create -- examples/assignment.json src/content/starter.json http://192.168.1.20:3000 assignment-link.txt
```

The command validates tasks against the chosen collection and creates a new link file without replacing an existing file. Share its link on the school network. In a standalone archive, run `node scripts/create-assignment.mjs` with the same arguments.

Students open the materials and mark their own checklist. Up to 64 checklists that have been marked at least once stay in the current browser and are included in progress backups. The progress screen can reopen or remove a checklist, including one whose boxes have all been cleared. Checklists are self-reported and do not verify identity or completion. Shared curriculum is unchanged.
