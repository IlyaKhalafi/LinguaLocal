import type { Word } from "./schema";
export const practiceModes = ["spelling", "listening", "gap"] as const;
export type PracticeMode = (typeof practiceModes)[number];

export function gapSentence(
  word: Pick<Word, "word" | "example">,
): string | null {
  if (!word.word.trim()) return null;
  const escaped = word.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
    "giu",
  );
  return pattern.test(word.example)
    ? word.example.replace(pattern, "_____").replace(/ +/g, " ")
    : null;
}
export function matchesAnswer(answer: string, expected: string): boolean {
  const clean = (value: string) =>
    value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[‘’]/g, "'")
      .replace(/\s+/g, " ")
      .replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, "");
  return clean(answer) === clean(expected);
}
