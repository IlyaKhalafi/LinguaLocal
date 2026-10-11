import { createHash } from "node:crypto";
import type { ContentPack } from "./schema";
export function contentVersion(content: ContentPack) {
  return `"${createHash("sha256").update(JSON.stringify(content)).digest("hex")}"`;
}
