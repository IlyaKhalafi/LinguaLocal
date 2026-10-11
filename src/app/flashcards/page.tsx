import { Flashcards } from "@/components/flashcards";
import { getContent } from "@/lib/content";
export const metadata = { title: "Flashcards" };
export default async function FlashcardsPage() {
  return <Flashcards words={(await getContent()).words} />;
}
