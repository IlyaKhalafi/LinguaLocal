import { Overview } from "@/components/overview";
import { getContent, getSettings } from "@/lib/content";
export default async function Home() {
  const [content, settings] = await Promise.all([getContent(), getSettings()]);
  return <Overview content={content} settings={settings} />;
}
