import { localizedMetadata } from "@/lib/locale-server";
import { Dictionary } from "@/components/dictionary";
import { getContent } from "@/lib/content";
export const generateMetadata = () => localizedMetadata("Dictionary");
export default async function DictionaryPage() {
  return <Dictionary words={(await getContent()).words} />;
}
