import { storagePaths } from "../../scripts/storage-paths.mjs";
import { stat } from "node:fs/promises";
import type { ZodType } from "zod";
import path from "node:path";
import { readValidatedJson, writeJsonAtomically } from "./json-file";
import {
  packSchema,
  settingsSchema,
  type ContentPack,
  type Settings,
} from "./schema";
import seed from "@/content/starter.json";
import { defaultSettings } from "./default-settings";
export { defaultSettings } from "./default-settings";

export const { dataDirectory, mediaDirectory } = storagePaths();

const starterContent = packSchema.parse(seed);
const documentCache = new Map<
  string,
  { signature: string; value: Promise<unknown> }
>();
async function readDocument<T>(
  name: string,
  fallback: T,
  schema: ZodType<T>,
): Promise<T> {
  try {
    const location = path.join(/* turbopackIgnore: true */ dataDirectory, name);
    const info = await stat(/* turbopackIgnore: true */ location);
    const signature = `${info.mtimeMs}:${info.ctimeMs}:${info.size}:${info.ino}`;
    const cached = documentCache.get(name);
    if (cached?.signature === signature) return (await cached.value) as T;
    const value = readValidatedJson(location, schema);
    documentCache.set(name, { signature, value });
    return await value;
  } catch (error) {
    documentCache.delete(name);
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw new Error(`Unable to read ${name}. Check the data directory.`, {
      cause: error,
    });
  }
}

export async function getContent(): Promise<ContentPack> {
  return readDocument("content.json", starterContent, packSchema);
}
export async function getSettings(): Promise<Settings> {
  return readDocument("settings.json", defaultSettings, settingsSchema);
}
export async function getSettingsState() {
  try {
    return { settings: await getSettings(), warning: "" };
  } catch (error) {
    console.error("Settings need repair", error);
    return {
      settings: defaultSettings,
      warning:
        "The school settings file could not be read. Ask the school to repair settings.json on the server.",
    };
  }
}
export async function atomicWrite(
  name: "content.json" | "settings.json",
  value: unknown,
) {
  await writeJsonAtomically(path.join(dataDirectory, name), value);
  documentCache.delete(name);
}
