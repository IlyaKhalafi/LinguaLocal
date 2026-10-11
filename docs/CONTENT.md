# Bring your own curriculum

The content studio manages books, words, and lessons. Each book groups local audio, video, and PDF resources. Content packs contain metadata and learning text. They do not embed media files.

## Content studio

Open `/studio` from School settings. Create or edit an item, keep it in the draft, then save the collection. Editor changes are not shared until they have been kept in the draft and the collection has been saved.

Kept drafts are saved in the current browser and can be restored after a reload. An item still open in its editor has not been kept yet. Navigation warns before leaving an unfinished item. If browser storage is unavailable, download the draft before leaving.

Books, words, and lessons can be removed with confirmation. Keep at least four dictionary words so vocabulary games remain available. Removing a book does not delete its media files.

The media tab lists supported files on the server, including bundled samples. Upload a file and choose it when editing a book resource. Add transcripts for listening material and WebVTT files for video captions.

If another browser saves while you are editing, the studio rejects the stale save. Download your draft, reload the latest collection, and reapply the changes.

## Portable packs

School settings exports and imports JSON collections. Importing replaces the current collection. Export a backup first. Personal progress remains intact, and only entries still present in the new collection appear in learning pages.

Packs have a maximum size of 2 MB. Use the current export as a template. Validation rules are in `src/lib/schema.ts`.

```json
{
  "version": 1,
  "words": [],
  "books": [],
  "lessons": []
}
```

This illustrates the three collections. A valid pack needs at least four dictionary entries so games have enough answer choices.

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

### Lessons

Each lesson has a title, description, level, category, reading time, and text sections. Its practice question contains two to six options, a zero-based correct answer index, and an explanation. Categories are Grammar, Vocabulary, Reading, and Speaking.

New lessons in the editor have a three-option question. Imported packs may use two to six options. Existing options are preserved during editing.

## Media files and large uploads

Browser uploads stream to a temporary file, enforce a 100 MB limit, and move into the media directory only when complete. Uploaded names are normalised and prefixed with a unique identifier.

For larger files or a whole textbook, copy a folder into the server’s media directory. The studio lists up to 2,000 files and explores six folder levels. Playback can serve deeper valid paths supplied through a pack.

Keep publisher materials out of the public repository. Schools should supply files they own or have permission to distribute. The original starter collection is included with the project.

## Migrating from the Python app

Copy the old app’s audio folders into the new media directory. Create books and connect tracks using their relative paths. The previous lesson, quiz, and dictionary models need conversion to the current pack format. There is no automatic migration command.

## Personal progress

Progress is exported separately from My progress or School settings. It contains saved words, lesson completions, review schedules, game attempts, activity dates, and a daily goal. Restore it in another browser to continue the same journey.

Shared computers use the same progress when they share a browser profile. Clearing browser storage removes progress. Save a backup first.
