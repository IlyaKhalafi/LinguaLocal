import { Matching } from "@/components/matching";
import { getContent } from "@/lib/content";
export const metadata = { title: "Perfect pairs" };
export default async function MatchingPage() {
  return <Matching words={(await getContent()).words} />;
}
