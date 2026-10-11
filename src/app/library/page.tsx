import { localizedMetadata } from "@/lib/locale-server";
import { Library } from "@/components/library";
import { getContent } from "@/lib/content";
export const generateMetadata = () => localizedMetadata("Library");
export default async function LibraryPage() {
  return <Library books={(await getContent()).books} />;
}
