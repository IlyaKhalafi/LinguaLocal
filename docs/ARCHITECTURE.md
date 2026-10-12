# Architecture and verification

LinguaLocal is a single Next.js App Router application. Server components load institution content. Client components handle interaction and browser progress. Route handlers read shared data and stream local media.

## Source layout

| Directory        | Responsibility                                                |
| ---------------- | ------------------------------------------------------------- |
| `src/app`        | Routes, layouts, loading states, and error boundaries         |
| `src/app/api`    | Content, settings, media listing, and streaming               |
| `src/components` | Learning screens, navigation, media controls, and preferences |
| `src/lib`        | Schemas, storage, learning logic, and HTTP helpers            |
| `src/content`    | Original starter collection                                   |
| `public/demo`    | Bundled audio, video, captions, and PDF samples               |
| `tests`          | Unit tests and browser workflows                              |
| `scripts`        | Packaging, production startup, and screenshot capture         |

## Shared content

Settings and content are validated JSON files. Reads share a cache keyed by file metadata and refresh after writes or external changes. Writes use a temporary file, flush it, and rename it over the target. Failed writes clean up temporary files.

Shared writes are performed through server files or the validated command-line installer. Public HTTP endpoints accept no shared-content mutations. Malformed content produces an error on learning pages. Malformed settings use a visible fallback welcome. Original files remain until the owner replaces them.

## Personal learning

Browser progress uses a validated local storage document and a React external store. Storage events update other tabs. Corrupt JSON is retained under a recovery key before a fresh state is used. If storage is unavailable, progress stays in memory and a notice appears.

Review intervals begin at one day and three days. Later intervals use the card’s ease, initially 2.2 and bounded between 1.3 and 3, with a 180-day cap. Forgetting resets the card for practice that day, counts a lapse, and lowers its ease. Hard and easy ratings adjust future intervals. Existing reviews retain their dates when loaded. This is a simple spaced review model rather than SM-2.

The progress document also supports bounded personal notes and study decks with tags. Missing fields in older backups receive empty defaults. Recovery retains valid individual notes and decks when another entry is damaged. Word and lesson notes use separate key prefixes so matching curriculum IDs remain distinct.

Date-dependent content uses a hydration-safe server snapshot before switching to the browser’s local day. Streaks allow yesterday to remain the latest active day before today’s first practice.

## Media

Playback resolves files inside the media or bundled demo directory. It supports full reads, HEAD requests, bounded ranges, suffix ranges, and downloads. Unsupported multi-range requests receive 416. Media is not compressed in transit.

Native players provide audio and video controls. Extra controls support speed, skipping back, and approximate passage repetition. A/B loops use time-update events and are intended for study rather than sample-accurate editing.

## Verification

```sh
npm run format:check
npm run check
npm run build
npm run test:e2e
```

Browser checks run in Chromium and WebKit and cover every starter book and lesson detail, all main pages, games, personal settings, and the not-found page. They check desktop and mobile accessibility, layout and navigation, page errors, real playback, persistent learning, read-only content, and operation with external requests blocked.

Screenshots can be regenerated from a running production server. The committed catalogue includes desktop and mobile pages plus active game and listening states using the starter collection.

The TypeScript 7 compiler is installed under `@typescript/native`. Its official TypeScript 6 compatibility package is aliased as `typescript` because lint tooling needs the compiler API. Fresh installation, linting, type checks, and production builds have been verified. Some upstream ESLint plugins still declare older peer ranges and npm reports those as warnings.

## Interface language

Translation catalogues are bundled with the app. A validated language cookie selects the server-rendered language and writing direction. The browser selector updates the interface immediately and preserves the choice for future visits. Curriculum content is not translated by the interface.

Logical CSS properties mirror navigation and spacing for Persian and Arabic. Bundled Noto Sans Arabic supports both scripts without external font requests. Complete counter messages allow each language to use its own word order. English and Arabic noun counts use locale plural rules.

Tests compare catalogue keys and placeholders, exercise every page in all four interfaces on desktop and mobile, and verify that language changes preserve progress and English reading direction.

Progress recovery keeps valid entries in each field and retains the most recent unreadable raw value in a separate browser key. Reset removes that recovery copy. A temporary storage failure can recover on the next write. If another tab changes saved progress during the failure, persistent writes stop until the student reloads the saved version. The unsaved visit can be exported first.
