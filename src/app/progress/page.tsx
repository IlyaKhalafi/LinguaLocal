import { dayKey } from "@/lib/learning";
import { ProgressDashboard } from "@/components/progress";
import { getContent } from "@/lib/content";
export const metadata = { title: "My progress" };
export default async function ProgressPage() {
  return (
    <ProgressDashboard serverDay={dayKey()} content={await getContent()} />
  );
}
