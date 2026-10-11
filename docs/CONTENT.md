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

### Importing a vocabulary spreadsheet

Export a UTF-8 CSV from your spreadsheet with `id`, `word`, `part`, `definition`, `example`, and `level` columns. Optional `phonetic` and `synonyms` columns are supported. Separate synonyms with `|` inside the cell. Comma and semicolon separators are detected automatically. Quoted commas, line breaks, and spreadsheet byte-order marks are accepted. Invalid records report their CSV line and field.

[Download the example spreadsheet](../examples/vocabulary.csv).

Run `npm run vocabulary:import -- words.csv new-collection.json collection.json` to merge vocabulary into an existing pack. Matching IDs update that word in the new output. The command reports how many existing words changed. The base collection stays intact, duplicate CSV IDs are rejected, and the output must be a new file. Omit the base path to create a vocabulary-only pack with at least four words.

In Docker, use `node scripts/import-vocabulary.mjs /tmp/words.csv /tmp/new-collection.json /tmp/collection.json`. Validate the output before installing it. The input and resulting pack each have a 2 MB limit.

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

### Lessons

Each lesson has a title, description, level, category, reading time, and text sections. Its practice question contains two to six options, a zero-based correct answer index, and an explanation. Categories are Grammar, Vocabulary, Reading, and Speaking.

Each question supports two to six answer options.

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

Progress is exported separately from My progress or Settings. It contains saved words, lesson completions, review schedules, game attempts, activity dates, and a daily goal. Restore it in another browser to continue the same journey.

Shared computers use the same progress when they share a browser profile. Clearing browser storage removes progress. Save a backup first.
