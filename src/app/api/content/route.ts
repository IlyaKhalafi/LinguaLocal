import { atomicWrite, getContent } from "@/lib/content";
import { apiError, readLimitedJson } from "@/lib/http";
import { packSchema } from "@/lib/schema";
export async function GET() {
  try {
    return Response.json(await getContent(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(request: Request) {
  try {
    const result = packSchema.safeParse(await readLimitedJson(request));
    if (!result.success)
      return Response.json(
        {
          error: "This content pack needs a few corrections.",
          issues: result.error.issues
            .map((issue) => `${issue.path.join(".")} ${issue.message}`)
            .slice(0, 8),
        },
        { status: 400 },
      );
    await atomicWrite("content.json", result.data);
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
