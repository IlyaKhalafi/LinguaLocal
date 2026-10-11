import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSubtitles,
  convertSubtitles,
  plainSubtitle,
  subtitleTime,
  subtitleTimestamp,
} from "../../src/lib/subtitles";

const srt =
  "\ufeff1\r\n00:00:01,250 --> 00:00:03,500\r\nHello, everyone.\r\nWelcome to class.\r\n\r\n2\r\n00:00:04,000 --> 00:00:05,000\r\n<i>Good morning!</i>\r\n";

test("SubRip conversion preserves text, millisecond timing and line breaks", () => {
  const converted = convertSubtitles(srt);
  assert.ok(converted.startsWith("WEBVTT\n\n"));
  const parsed = parseSubtitles(converted);
  assert.equal(parsed.format, "vtt");
  assert.equal(parsed.cues[0].start, 1.25);
  assert.equal(parsed.cues[0].end, 3.5);
  assert.equal(parsed.cues[0].text, "Hello, everyone.\nWelcome to class.");
  assert.equal(parsed.cues[1].text, "<i>Good morning!</i>");
  assert.deepEqual(parsed.warnings, []);
});

test("WebVTT metadata and cue settings survive normalization", () => {
  const text =
    "  WEBVTT\n\nNOTE Classroom sample\n\nSTYLE\n::cue { color: white; }\n\nhello\n00:01.000 --> 00:03.000 align:start position:20%\n<v Anna>Hello &amp; welcome.\n";
  const parsed = parseSubtitles(text);
  assert.equal(parsed.cues.length, 1);
  assert.equal(parsed.cues[0].id, "hello");
  assert.equal(parsed.cues[0].settings, "align:start position:20%");
  assert.equal(plainSubtitle(parsed.cues[0].text), "Hello & welcome.");
  assert.ok(convertSubtitles(text).startsWith("WEBVTT\n"));
  assert.ok(convertSubtitles(text).includes("::cue { color: white; }"));
});

test("subtitle diagnostics flag overlaps, ordering and long phone captions", () => {
  const text =
    "1\n00:00:03,000 --> 00:00:06,000\nLater caption.\n\n2\n00:00:01,000 --> 00:00:04,000\n" +
    "Long caption text. ".repeat(5);
  const parsed = parseSubtitles(text);
  assert.ok(
    parsed.warnings.some((warning) => warning.message.includes("Overlaps")),
  );
  assert.ok(
    parsed.warnings.some((warning) => warning.message.includes("previous")),
  );
  assert.ok(
    parsed.warnings.some((warning) => warning.message.includes("wrap")),
  );
  assert.equal(parseSubtitles(convertSubtitles(text)).cues[0].start, 1);
});

test("invalid cue timing, empty files and malformed WebVTT headers are rejected", () => {
  for (const text of [
    "",
    "WEBVTT",
    "1\n00:00:03,000 --> 00:00:01,000\nBackwards.",
    "1\n00:61:01,000 --> 00:62:01,000\nInvalid.",
    "WEBVTT\n00:01.000 --> 00:02.000\nNo header break.",
    "WEBVTT\n\n00:01,000 --> 00:02,000\nWrong separator.",
    "1\n00:00:01,000 --> 00:00:02,000\n",
  ])
    assert.throws(() => parseSubtitles(text));
  assert.equal(subtitleTime("01:02.300"), 62.3);
  assert.equal(subtitleTime("01:00:00,001"), 3600.001);
  assert.equal(subtitleTime("-1:00.000"), null);
  assert.equal(subtitleTimestamp(3600.001), "01:00:00.001");
});

test("real-world SubRip exports normalize shorthand times and literal text", () => {
  const output = convertSubtitles(
    "1\n0:00:01,5-->0:00:02,75\n{\\an8}<i>5 < 6 & good</i>",
  );
  assert.ok(output.includes("00:00:01.500 --> 00:00:02.750"));
  assert.ok(output.includes("<i>5 &lt; 6 &amp; good</i>"));
  assert.equal(
    plainSubtitle(parseSubtitles(output).cues[0].text),
    "5 < 6 & good",
  );
});
