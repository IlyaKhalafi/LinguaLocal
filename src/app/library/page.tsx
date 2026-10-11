import { Library } from "@/components/library";
import { getContent } from "@/lib/content";
export const metadata = { title: "Book library" };
export default async function LibraryPage() {
  return <Library books={(await getContent()).books} />;
}
