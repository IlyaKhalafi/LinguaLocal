import { notFound } from "next/navigation";
import { LessonDetail } from "@/components/lesson-detail";
import { getContent } from "@/lib/content";
import { resolveLessonStudy } from "@/lib/lesson-study";
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
  const study = resolveLessonStudy(await getContent(), id);
  if (!study) notFound();
  return <LessonDetail lesson={study.lesson} next={study.next} />;
}
