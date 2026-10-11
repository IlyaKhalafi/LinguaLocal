import { localizedMetadata } from "@/lib/locale-server";
import { Flashcards } from "@/components/flashcards";
import { getContent } from "@/lib/content";
export const generateMetadata = () => localizedMetadata("Flashcards");
export default async function FlashcardsPage() {
  return <Flashcards words={(await getContent()).words} />;
}
