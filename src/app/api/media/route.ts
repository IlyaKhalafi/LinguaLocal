import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { mediaDirectory } from "@/lib/content";
import { mimeTypes } from "@/lib/media";
import { apiError } from "@/lib/http";
import type { MediaFile } from "@/lib/media-types";

export async function GET() {
  try {
    const files = new Map<string, MediaFile>();
    for (const root of [path.resolve("public/demo"), mediaDirectory]) {
      const pending = [{ directory: root, relative: "", depth: 0 }];
      while (pending.length && files.size < 2000) {
        const entry = pending.shift()!;
        const children = await readdir(
          /* turbopackIgnore: true */ entry.directory,
          { withFileTypes: true },
        ).catch((error: NodeJS.ErrnoException) => {
          if (error.code === "ENOENT") return [];
          throw error;
        });
        for (const child of children) {
          if (child.name.startsWith(".") || child.isSymbolicLink()) continue;
          const relative = entry.relative
            ? `${entry.relative}/${child.name}`
            : child.name;
          const location = path.join(entry.directory, child.name);
          if (child.isDirectory() && entry.depth < 6)
            pending.push({
              directory: location,
              relative,
              depth: entry.depth + 1,
            });
          if (!child.isFile()) continue;
          const extension = path.extname(child.name).toLowerCase();
          if (!mimeTypes[extension]) continue;
          const info = await stat(/* turbopackIgnore: true */ location);
          files.set(relative, {
            file: relative,
            bytes: info.size,
            kind:
              extension === ".pdf"
                ? "pdf"
                : extension === ".vtt"
                  ? "captions"
                  : [".mp4", ".webm"].includes(extension)
                    ? "video"
                    : "audio",
          });
          if (files.size >= 2000) break;
        }
      }
    }
    return Response.json(
      {
        files: [...files.values()].sort((a, b) => a.file.localeCompare(b.file)),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
