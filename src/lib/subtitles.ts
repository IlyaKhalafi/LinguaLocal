import { DOCUMENT_LIMIT } from "./document-limits";

export type SubtitleCue = {
  id: string;
  start: number;
  end: number;
  text: string;
  settings: string;
};
export type SubtitleWarning = { cue: number; message: string };

export function subtitleTime(value: string): number | null {
  const match = /^(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{1,3})$/.exec(value);
  if (!match || Number(match[2]) > 59 || Number(match[3]) > 59) return null;
  const milliseconds =
    (Number(match[1] || 0) * 3600 + Number(match[2]) * 60 + Number(match[3])) *
      1000 +
    Number(match[4].padEnd(3, "0"));
  return Number.isSafeInteger(milliseconds) ? milliseconds / 1000 : null;
}

export function subtitleTimestamp(seconds: number): string {
  const milliseconds = Math.round(seconds * 1000);
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0)
    throw new Error("Invalid subtitle time.");
  const hours = Math.floor(milliseconds / 3600000),
    minutes = Math.floor(milliseconds / 60000) % 60,
    remaining = Math.floor(milliseconds / 1000) % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}.${String(milliseconds % 1000).padStart(3, "0")}`;
}

export function plainSubtitle(text: string): string {
  const entities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    nbsp: " ",
    lrm: "\u200e",
    rlm: "\u200f",
    quot: '"',
    apos: "'",
  };
  return text
    .replace(/<[^>]*>/g, "")
    .replace(
      /&(amp|lt|gt|nbsp|lrm|rlm|quot|apos);/g,
      (_, name: string) => entities[name],
    );
}

function normalizeSubtitles(input: string) {
  return input
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

export function parseSubtitles(input: string) {
  if (input.length > DOCUMENT_LIMIT)
    throw new Error("Subtitle file exceeds the size limit.");
  if (input.includes("\0"))
    throw new Error("Subtitle text contains null characters.");
  const normalized = normalizeSubtitles(input);
  const format = /^WEBVTT(?:[ \t\n]|$)/.test(normalized) ? "vtt" : "srt";
  const blocks = normalized.split(/\n[ \t]*\n+/);
  const cues: SubtitleCue[] = [],
    warnings: SubtitleWarning[] = [];
  for (const [blockIndex, block] of blocks.entries()) {
    if (format === "vtt") {
      if (blockIndex === 0) {
        if (block.includes("-->"))
          throw new Error("WebVTT header must end with a blank line.");
        continue;
      }
      if (/^(?:NOTE|STYLE|REGION)(?:[ \t\n]|$)/.test(block)) continue;
    }
    const lines = block.trim().split("\n");
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    const number = cues.length + 1;
    if (number > 20000)
      throw new Error("Subtitle file contains too many cues.");
    if (timingIndex < 0 || timingIndex > 1)
      throw new Error(`Cue ${number} has no valid timing line.`);
    const timing = (
      format === "vtt"
        ? /^(\S+)\s+-->\s+(\S+)(?:[ \t]+(.*))?$/
        : /^(\d[\d:.,]*)\s*-->\s*(\d[\d:.,]*)(?:[ \t]+(.*))?$/
    ).exec(lines[timingIndex].trim());
    if (
      format === "vtt" &&
      timing &&
      ![timing[1], timing[2]].every((time) =>
        /^(?:\d{2,}:)?\d{2}:\d{2}\.\d{3}$/.test(time),
      )
    )
      throw new Error(`Cue ${number} must use WebVTT timestamp separators.`);
    const start = timing ? subtitleTime(timing[1]) : null,
      end = timing ? subtitleTime(timing[2]) : null;
    if (start === null || end === null || end <= start)
      throw new Error(`Cue ${number} has invalid start or end times.`);
    const text = lines
      .slice(timingIndex + 1)
      .join("\n")
      .trim();
    if (!text || text.includes("-->"))
      throw new Error(`Cue ${number} has invalid or empty subtitle text.`);
    const previous = cues.at(-1);
    if (previous && start < previous.start)
      warnings.push({
        cue: number,
        message: "Starts before the previous cue.",
      });
    const linesOfText = plainSubtitle(text).split("\n");
    if (
      linesOfText.length > 2 ||
      linesOfText.some((line) => [...line].length > 42)
    )
      warnings.push({
        cue: number,
        message: "Long caption text may wrap on a phone.",
      });
    cues.push({
      id: timingIndex ? lines[0] : String(number),
      start,
      end,
      text,
      settings: timing?.[3] ?? "",
    });
  }
  if (!cues.length) throw new Error("Subtitle file contains no cues.");
  let furthestEnd = -1;
  const ordered = cues
    .map((cue, index) => ({ cue, index }))
    .sort((a, b) => a.cue.start - b.cue.start);
  for (const { cue, index } of ordered) {
    if (cue.start < furthestEnd)
      warnings.push({ cue: index + 1, message: "Overlaps another cue." });
    furthestEnd = Math.max(furthestEnd, cue.end);
  }
  return { format, cues, warnings: warnings.sort((a, b) => a.cue - b.cue) };
}

export function convertSubtitles(input: string): string {
  const { format, cues } = parseSubtitles(input);
  if (format === "vtt") return normalizeSubtitles(input) + "\n";
  return (
    "WEBVTT\n\n" +
    [...cues]
      .sort((a, b) => a.start - b.start)
      .map(
        (cue) =>
          `${cue.id}\n${subtitleTimestamp(cue.start)} --> ${subtitleTimestamp(cue.end)}${cue.settings ? " " + cue.settings : ""}\n${cue.text
            .replace(/\{\\an[1-9]\}/g, "")
            .replace(/<\/?font\b[^>]*>/gi, "")
            .replace(/&(?!(?:amp|lt|gt|nbsp|lrm|rlm|quot|apos);)/g, "&amp;")
            .replace(/<(?!\/?(?:b|i|u)>)/g, "&lt;")}`,
      )
      .join("\n\n") +
    "\n"
  );
}
