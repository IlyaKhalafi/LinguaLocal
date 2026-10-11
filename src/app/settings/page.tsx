import { localizedMetadata } from "@/lib/locale-server";
import { PersonalSettings } from "@/components/settings";

export const generateMetadata = () => localizedMetadata("Settings");
export default function SettingsPage() {
  return <PersonalSettings />;
}
