import { mkdir, open, rename, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mediaDirectory } from "@/lib/content";
import { mimeTypes } from "@/lib/media";
import { apiError, HttpError } from "@/lib/http";
import { checkMutation } from "@/lib/mutations";
const MAX_SIZE = 100 * 1024 * 1024;
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkMutation(request);
    if (request.headers.get("x-lingualocal-upload") !== "1")
      throw new HttpError(
        400,
        "Use the upload action in your school’s content studio.",
      );
  } catch (error) {
    return apiError(error);
  }
  const originalName = new URL(request.url).searchParams.get("name") ?? "";
  const extension = path.extname(originalName).toLowerCase();
  const base =
    path
      .basename(originalName, extension)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "media";
  const name = base + extension;
  if (
    /[\\/]/.test(originalName) ||
    originalName.includes("..") ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,150}$/.test(name) ||
    name.includes("..") ||
    !mimeTypes[path.extname(name).toLowerCase()]
  )
    return Response.json(
      {
        error:
          "Use a simple filename and an MP3, WAV, OGG, M4A, FLAC, MP4, WebM, PDF, or WebVTT file.",
      },
      { status: 400 },
    );
  if (Number(request.headers.get("content-length")) > MAX_SIZE)
    return Response.json(
      {
        error:
          "The upload limit is 100 MB. Copy larger files into the media directory.",
      },
      { status: 413 },
    );
  if (!request.body)
    return Response.json({ error: "Choose a file first." }, { status: 400 });
  const temporary = path.join(mediaDirectory, `.upload-${randomUUID()}`);
  const reader = request.body.getReader();
  let handle;
  let size = 0;
  try {
    await mkdir(mediaDirectory, { recursive: true });
    handle = await open(temporary, "wx");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_SIZE) {
        await reader.cancel();
        throw new HttpError(413, "The upload limit is 100 MB.");
      }
      await handle.writeFile(value);
    }
    if (!size) throw new HttpError(400, "The selected file is empty.");
    await handle.close();
    handle = undefined;
    const filename = `${randomUUID().slice(0, 8)}-${name}`;
    await rename(temporary, path.join(mediaDirectory, filename));
    return Response.json({ file: filename, size });
  } catch (error) {
    return apiError(error);
  } finally {
    reader.releaseLock();
    await handle?.close();
    await unlink(temporary).catch(() => undefined);
  }
}
