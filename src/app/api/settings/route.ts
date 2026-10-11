import { atomicWrite, getSettings } from "@/lib/content";
import { apiError, readLimitedJson } from "@/lib/http";
import { settingsSchema } from "@/lib/schema";
import { checkMutation } from "@/lib/mutations";
export async function GET() {
  try {
    return Response.json(await getSettings(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(request: Request) {
  try {
    checkMutation(request);
    const result = settingsSchema.safeParse(await readLimitedJson(request));
    if (!result.success)
      return Response.json(
        {
          error:
            "Add a school name and a welcome message within the character limits.",
        },
        { status: 400 },
      );
    await atomicWrite("settings.json", result.data);
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
