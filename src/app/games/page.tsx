import { localizedMetadata } from "@/lib/locale-server";
import { Games } from "@/components/games";
export const generateMetadata = () => localizedMetadata("Games");
export default function GamesPage() {
  return <Games />;
}
