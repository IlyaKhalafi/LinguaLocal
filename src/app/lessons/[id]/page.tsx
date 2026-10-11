import { notFound } from "next/navigation";
import { LessonDetail } from "@/components/lesson-detail";
import { getContent } from "@/lib/content";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = (await getContent()).lessons.find((item) => item.id === id);
  return { title: item?.title ?? "LinguaLocal" };
}
export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = (await getContent()).lessons.find(
    (lesson) => lesson.id === id,
  );
  if (!lesson) notFound();
  return <LessonDetail lesson={lesson} />;
}
