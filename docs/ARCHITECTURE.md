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

Review intervals expand from one day to three days, then about 2.2 times the previous interval, capped at 180 days. Forgetting resets a card for practice that day. This is a simple spaced review model rather than SM-2.

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
