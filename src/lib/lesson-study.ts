import type { ContentPack, Lesson } from "./schema";

export type LessonSummary = Pick<Lesson, "id" | "title">;
export type LessonStudyScope = LessonSummary & { next?: LessonSummary };

export function resolveLessonStudy(content: ContentPack, id: string) {
  const index = content.lessons.findIndex((lesson) => lesson.id === id);
  if (index < 0) return undefined;
  const lesson = content.lessons[index];
  const vocabulary = new Map(content.words.map((word) => [word.id, word]));
  const words = (lesson.wordIds ?? []).flatMap((id) => {
    const word = vocabulary.get(id);
    return word ? [word] : [];
  });
  const following = content.lessons
    .slice(index + 1)
    .find((item) => item.level === lesson.level);
  const next = following
    ? { id: following.id, title: following.title }
    : undefined;
  return { lesson, words, next };
}
