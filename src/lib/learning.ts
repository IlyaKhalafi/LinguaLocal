import type { Word } from "./schema";

export type Review = { interval: number; due: string; repetitions: number };
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
};
export const emptyProgress: Progress = {
  saved: [],
  completed: [],
  reviews: {},
  attempts: [],
  activity: {},
  goal: 10,
};

export function dayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function scheduleReview(
  previous: Review | undefined,
  remembered: boolean,
  now = new Date(),
): Review {
  const repetitions = remembered ? (previous?.repetitions ?? 0) + 1 : 0;
  const interval = remembered
    ? repetitions === 1
      ? 1
      : repetitions === 2
        ? 3
        : Math.min(180, Math.round((previous?.interval ?? 3) * 2.2))
    : 0;
  const due = new Date(now);
  due.setDate(due.getDate() + interval);
  return { interval, repetitions, due: dayKey(due) };
}

export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function makeQuiz(words: Word[], count = 8) {
  return shuffle(words)
    .slice(0, count)
    .map((word) => ({
      word,
      options: shuffle([
        word,
        ...shuffle(words.filter((other) => other.id !== word.id)).slice(0, 3),
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
