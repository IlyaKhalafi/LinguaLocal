import { getContent, saveContent } from "@/lib/content";
import { contentVersion } from "@/lib/content-version";
import { apiError, readLimitedJson } from "@/lib/http";
import { packSchema } from "@/lib/schema";
import { checkMutation } from "@/lib/mutations";
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
export async function PUT(request: Request) {
  try {
    checkMutation(request);
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
    const version = await saveContent(
      result.data,
      request.headers.get("if-match"),
    );
    return Response.json({ ok: true, version });
  } catch (error) {
    return apiError(error);
  }
}
