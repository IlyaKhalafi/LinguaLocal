import { SchoolSettings } from "@/components/settings";
import { getContentState, getSettingsState } from "@/lib/content";
export const metadata = { title: "School settings" };
export default async function SettingsPage() {
  const [{ settings }, { content, warning }] = await Promise.all([
    getSettingsState(),
    getContentState(),
  ]);
  return (
    <>
      {warning && (
        <p className="inline-message" role="alert">
          {warning}
        </p>
      )}
      <SchoolSettings settings={settings} content={content} />
    </>
  );
}
