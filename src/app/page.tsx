import { localizedMetadata } from "@/lib/locale-server";
import { dayKey } from "@/lib/learning";
import { Overview } from "@/components/overview";
import { getContent, getSettingsState } from "@/lib/content";
export const generateMetadata = () => localizedMetadata("Home");
export default async function Home() {
  const [content, { settings }] = await Promise.all([
    getContent(),
    getSettingsState(),
  ]);
  return (
    <Overview serverDay={dayKey()} content={content} settings={settings} />
  );
}
