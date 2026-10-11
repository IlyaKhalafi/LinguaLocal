import { ContentStudio } from "@/components/studio";
import { getContentState } from "@/lib/content";
import { contentVersion } from "@/lib/content-version";
export const metadata = { title: "Content studio" };
export default async function StudioPage() {
  const { content, warning } = await getContentState();
  return (
    <>
      {warning && (
        <p className="inline-message" role="alert">
          {warning}
        </p>
      )}
      <ContentStudio
        initialContent={content}
        initialVersion={contentVersion(content)}
      />
    </>
  );
}
