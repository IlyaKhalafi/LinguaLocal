import { Dictionary } from "@/components/dictionary";
import { getContent } from "@/lib/content";
export const metadata = { title: "Dictionary" };
export default async function DictionaryPage() {
  return <Dictionary words={(await getContent()).words} />;
}
