import { packSchema, type ContentPack } from "./schema";

/** Keep lesson vocabulary available even when it belongs to another level. */
export function selectLevelPack(
  source: ContentPack,
  level: ContentPack["words"][number]["level"],
): ContentPack {
  const lessons = source.lessons.filter((lesson) => lesson.level === level);
  const requiredWords = new Set(
    lessons.flatMap((lesson) => lesson.wordIds ?? []),
  );
  return packSchema.parse({
    version: 1,
    words: source.words.filter(
      (word) => word.level === level || requiredWords.has(word.id),
    ),
    books: source.books.filter((book) => book.level === level),
    lessons,
  });
}
