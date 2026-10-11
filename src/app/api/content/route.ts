import { getContent } from "@/lib/content";
import { contentVersion } from "@/lib/content-version";
import { apiError } from "@/lib/http";
export async function GET() {
  try {
    const content = await getContent();
    return Response.json(content, {
      headers: { "Cache-Control": "no-store", ETag: contentVersion(content) },
    });
  } catch (error) {
    return apiError(error);
  }
}
