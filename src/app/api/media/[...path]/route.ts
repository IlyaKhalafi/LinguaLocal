import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { parseRange, resolveMedia } from "@/lib/media";
export const runtime = "nodejs";

async function serve(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
  head: boolean,
) {
  try {
    const media = await resolveMedia((await context.params).path);
    if (!media)
      return Response.json(
        { error: "This media file is not available." },
        { status: 404 },
      );
    const range = parseRange(request.headers.get("range"), media.info.size);
    const headers = new Headers({
      "Content-Type": media.type,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    });
    if (range === "invalid") {
      headers.set("Content-Range", `bytes */${media.info.size}`);
      return new Response(null, { status: 416, headers });
    }
    if (new URL(request.url).searchParams.has("download"))
      headers.set(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(media.file))}`,
      );
    const start = range?.start ?? 0;
    const end = range?.end ?? media.info.size - 1;
    headers.set(
      "Content-Length",
      String(range ? end - start + 1 : media.info.size),
    );
    if (range)
      headers.set("Content-Range", `bytes ${start}-${end}/${media.info.size}`);
    if (head || media.info.size === 0)
      return new Response(null, { status: range ? 206 : 200, headers });
    const stream = createReadStream(media.file, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
      status: range ? 206 : 200,
      headers,
    });
  } catch (error) {
    console.error("Media request failed", error);
    return Response.json(
      { error: "Unable to read this media file." },
      { status: 500 },
    );
  }
}
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return serve(request, context, false);
}
export async function HEAD(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return serve(request, context, true);
}
