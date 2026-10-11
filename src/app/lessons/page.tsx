import { localizedMetadata } from "@/lib/locale-server";
import { Lessons } from "@/components/lessons";
import { getContent } from "@/lib/content";
export const generateMetadata = () => localizedMetadata("Lessons");
export default async function LessonsPage() {
  return <Lessons lessons={(await getContent()).lessons} />;
}
