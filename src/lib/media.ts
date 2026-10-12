import path from "node:path";
import { mediaDirectory } from "./content";
import { resolveMediaFile } from "./media-files";
export { mimeTypes } from "./media-files";

export { parseRange } from "./byte-range";

export function resolveMedia(segments: string[]) {
  return resolveMediaFile(segments, [
    mediaDirectory,
    path.resolve("public/demo"),
  ]);
}
