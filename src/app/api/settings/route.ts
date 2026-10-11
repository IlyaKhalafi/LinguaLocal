import { getSettings } from "@/lib/content";
import { apiError } from "@/lib/http";
export async function GET() {
  try {
    return Response.json(await getSettings(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
