import { localizedMetadata } from "@/lib/locale-server";
import { Matching } from "@/components/matching";
import { getContent } from "@/lib/content";
export const generateMetadata = () => localizedMetadata("Matching");
export default async function MatchingPage() {
  return <Matching words={(await getContent()).words} />;
}
