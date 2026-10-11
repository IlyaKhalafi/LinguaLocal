import { localizedMetadata } from "@/lib/locale-server";
import { Dictionary } from "@/components/dictionary";
import { getContent } from "@/lib/content";
export const generateMetadata = () => localizedMetadata("Dictionary");
export default async function DictionaryPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; search?: string }>;
}) {
  const params = await searchParams;
  return (
    <Dictionary
      words={(await getContent()).words}
      focusSearch={params.focus === "search"}
    />
  );
}
