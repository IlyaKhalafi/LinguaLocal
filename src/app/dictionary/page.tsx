import { dayKey } from "@/lib/learning";
import { Dictionary } from "@/components/dictionary";
import { getContent } from "@/lib/content";
export const metadata = { title: "Dictionary" };
export default async function DictionaryPage() {
  return <Dictionary serverDay={dayKey()} words={(await getContent()).words} />;
}
