import { localizedMetadata } from "@/lib/locale-server";
import { dayKey } from "@/lib/learning";
import { ProgressDashboard } from "@/components/progress";
import { getContent } from "@/lib/content";
export const generateMetadata = () => localizedMetadata("Progress");
export default async function ProgressPage() {
  return (
    <ProgressDashboard serverDay={dayKey()} content={await getContent()} />
  );
}
