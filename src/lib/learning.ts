import type { Word } from "./schema";

export type ReviewRating = "again" | "hard" | "good" | "easy";
export type Review = {
  interval: number;
  due: string;
  repetitions: number;
  ease?: number;
  lapses?: number;
};
export type StudyDeck = { name: string; tags: string[]; words: string[] };
export type Attempt = {
  id: string;
  title: string;
  score: number;
  total: number;
  date: string;
};
export type Progress = {
  saved: string[];
  completed: string[];
  reviews: Record<string, Review>;
  attempts: Attempt[];
  activity: Record<string, number>;
  goal: number;
  notes: Record<string, string>;
  decks: Record<string, StudyDeck>;
};
export const emptyProgress: Progress = {
  saved: [],
  completed: [],
  reviews: {},
  attempts: [],
  activity: {},
  goal: 10,
  notes: {},
  decks: {},
};
export function isDifficultReview(review: Review | undefined) {
  return (review?.lapses ?? 0) >= 2 && (review?.repetitions ?? 0) < 3;
}
export function getReview(reviews: Record<string, Review>, id: string) {
  return Object.hasOwn(reviews, id) ? reviews[id] : undefined;
}

export function dayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function scheduleReview(
  previous: Review | undefined,
  remembered: boolean | ReviewRating,
  now = new Date(),
): Review {
  const rating =
    typeof remembered === "boolean"
      ? remembered
        ? "good"
        : "again"
      : remembered;
  const recalled = rating !== "again";
  const repetitions = recalled ? (previous?.repetitions ?? 0) + 1 : 0;
  const ease = Math.max(
    1.3,
    Math.min(
      3,
      (previous?.ease ?? 2.2) +
        (rating === "easy"
          ? 0.15
          : rating === "hard"
            ? -0.15
            : rating === "again"
              ? -0.2
              : 0),
    ),
  );
  const lapses = (previous?.lapses ?? 0) + (recalled ? 0 : 1);
  const interval = recalled
    ? repetitions === 1
      ? rating === "easy"
        ? 3
        : 1
      : repetitions === 2
        ? rating === "hard"
          ? 1
          : rating === "easy"
            ? 5
            : 3
        : Math.min(
            180,
            Math.max(
              1,
              Math.round(
                (previous?.interval ?? 3) * (rating === "hard" ? 1.2 : ease),
              ),
            ),
          )
    : 0;
  const due = new Date(now);
  due.setDate(due.getDate() + interval);
  return { interval, repetitions, due: dayKey(due), ease, lapses };
}

export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/** Avoid indistinguishable choices when a school imports overlapping entries. */
export function distinctGameWords(words: readonly Word[]): Word[] {
  const heads = new Set<string>();
  const meanings = new Set<string>();
  const normalize = (value: string) =>
    value
      .normalize("NFKC")
      .trim()
      .replace(/\s+/gu, " ")
      .toLocaleLowerCase("en");
  return words.filter((word) => {
    const head = normalize(word.word);
    const meaning = normalize(word.definition)
      .replace(/[.!?]+$/u, "")
      .trimEnd();
    if (heads.has(head) || meanings.has(meaning)) return false;
    heads.add(head);
    meanings.add(meaning);
    return true;
  });
}

export function makeQuiz(words: Word[], count = 8) {
  const pool = distinctGameWords(words);
  if (pool.length < 4) return [];
  return shuffle(pool)
    .slice(0, count)
    .map((word) => ({
      word,
      options: shuffle([
        word,
        ...shuffle(pool.filter((other) => other.id !== word.id)).slice(0, 3),
      ]),
    }));
}

export function dailyWord(words: Word[], date = new Date()) {
  const key = dayKey(date);
  const hash = [...key].reduce(
    (value, char) => value * 31 + char.charCodeAt(0),
    0,
  );
  return words[Math.abs(hash) % words.length];
}

export function streak(
  activity: Record<string, number>,
  now = new Date(),
): number {
  const cursor = new Date(now);
  if (!activity[dayKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
  let days = 0;
  while (activity[dayKey(cursor)]) {
    days++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return days;
}
