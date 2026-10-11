import { Quiz } from "@/components/quiz";
import { getContent } from "@/lib/content";
export const metadata = { title: "Word explorer" };
export default async function QuizPage() {
  return <Quiz words={(await getContent()).words} />;
}
