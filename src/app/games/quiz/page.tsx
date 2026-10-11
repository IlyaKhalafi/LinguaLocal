import { localizedMetadata } from "@/lib/locale-server";
import { Quiz } from "@/components/quiz";
import { getContent } from "@/lib/content";
export const generateMetadata = () => localizedMetadata("Vocabulary quiz");
export default async function QuizPage() {
  return <Quiz words={(await getContent()).words} />;
}
