import { Lessons } from "@/components/lessons";
import { getContent } from "@/lib/content";
export const metadata = { title: "Lessons" };
export default async function LessonsPage() {
  return <Lessons lessons={(await getContent()).lessons} />;
}
