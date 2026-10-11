import { localizedMetadata } from "@/lib/locale-server";
import { Dictionary } from "@/components/dictionary";
import { getContent } from "@/lib/content";
export const generateMetadata = () => localizedMetadata("Dictionary");
export default async function DictionaryPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  return (
    <Dictionary
      words={(await getContent()).words}
      focusSearch={(await searchParams).focus === "search"}
    />
  );
}
