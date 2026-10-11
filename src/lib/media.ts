import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { mediaDirectory } from "./content";

export const mimeTypes: Record<string, string> = {
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".flac": "audio/flac",
  ".mp4": "video/mp4", ".webm": "video/webm", ".pdf": "application/pdf",
};

export function parseRange(header: string | null, size: number): { start: number; end: number } | null | "invalid" {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size === 0) return "invalid";
  let start: number; let end: number;
  if (!match[1]) { const suffix = Number(match[2]); if (!Number.isSafeInteger(suffix) || suffix <= 0) return "invalid";start = Math.max(0,size-suffix);end = size-1; }
  else { start = Number(match[1]);end = match[2] ? Number(match[2]) : size-1; }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return "invalid";
  return {start,end:Math.min(end,size-1)};
}

export async function resolveMedia(segments: string[]) {
  if (!segments.length || segments.some((segment) => !segment || segment === "." || segment === ".." || /[\\/\x00]/.test(segment))) return null;
  const relative = segments.join("/");
  const type = mimeTypes[path.extname(relative).toLowerCase()];
  if (!type) return null;
  for (const root of [mediaDirectory, path.resolve("public/demo")]) {
    try {
      const [realRoot,file] = await Promise.all([realpath(root),realpath(path.join(root,relative))]);
      if (!file.startsWith(`${realRoot}${path.sep}`)) continue;
      const info = await stat(file);
      if (info.isFile()) return { file,info,type };
    } catch (error) { if (!["ENOENT","ENOTDIR"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error; }
  }
  return null;
}
