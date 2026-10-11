import { dayKey } from "@/lib/learning";
import { Overview } from "@/components/overview";
import { getContent, getSettings } from "@/lib/content";
export default async function Home() {
  const [content, settings] = await Promise.all([getContent(), getSettings()]);
  return (
    <Overview serverDay={dayKey()} content={content} settings={settings} />
  );
}
