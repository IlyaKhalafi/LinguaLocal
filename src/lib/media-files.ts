import { realpath, stat } from "node:fs/promises";
import path from "node:path";

export const mimeTypes: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".flac": "audio/flac",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".vtt": "text/vtt; charset=utf-8",
};

export async function resolveMediaFile(
  segments: string[],
  roots: readonly string[],
) {
  if (
    !segments.length ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        /[\\/\x00]/.test(segment),
    )
  )
    return null;
  const relative = segments.join("/");
  const type = mimeTypes[path.extname(relative).toLowerCase()];
  if (!type) return null;
  for (const root of roots) {
    try {
      const [realRoot, file] = await Promise.all([
        realpath(/* turbopackIgnore: true */ root),
        realpath(
          /* turbopackIgnore: true */ path.join(
            /* turbopackIgnore: true */ root,
            relative,
          ),
        ),
      ]);
      const contained = path.relative(realRoot, file);
      if (
        !contained ||
        contained === ".." ||
        contained.startsWith(`..${path.sep}`) ||
        path.isAbsolute(contained)
      )
        continue;
      const info = await stat(file);
      if (info.isFile()) return { file, info, type };
    } catch (error) {
      if (
        !["ENOENT", "ENOTDIR"].includes(
          (error as NodeJS.ErrnoException).code ?? "",
        )
      )
        throw error;
    }
  }
  return null;
}
