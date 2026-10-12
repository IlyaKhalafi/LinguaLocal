import { localizedMetadata } from "@/lib/locale-server";
import { Flashcards } from "@/components/flashcards";
import { getContent } from "@/lib/content";
import { notFound } from "next/navigation";
import { resolveLessonStudy } from "@/lib/lesson-study";
export const generateMetadata = () => localizedMetadata("Flashcards");
export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string | string[] }>;
}) {
  const { lesson } = await searchParams;
  const content = await getContent();
  if (lesson === undefined)
    return <Flashcards key="unscoped" words={content.words} />;
  if (typeof lesson !== "string") notFound();
  const study = resolveLessonStudy(content, lesson);
  if (!study) notFound();
  return (
    <Flashcards
      key={`lesson-${lesson}`}
      words={study.words}
      scope={{ id: lesson, title: study.lesson.title, next: study.next }}
    />
  );
}
