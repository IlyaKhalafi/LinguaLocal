import { localizedMetadata } from "@/lib/locale-server";
import { Practice } from "@/components/practice";
import { getContent } from "@/lib/content";
export const generateMetadata = () => localizedMetadata("Practice");
export default async function PracticePage() {
  return <Practice words={(await getContent()).words} />;
}
