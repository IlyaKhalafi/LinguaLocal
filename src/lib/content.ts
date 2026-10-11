import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import type { ZodType } from "zod";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  packSchema,
  settingsSchema,
  type ContentPack,
  type Settings,
} from "./schema";
import seed from "@/content/starter.json";

export const dataDirectory = path.resolve(
  /* turbopackIgnore: true */
  process.env.LINGUALOCAL_DATA_DIR || "data",
);
export const mediaDirectory = path.resolve(
  /* turbopackIgnore: true */
  process.env.LINGUALOCAL_MEDIA_DIR || path.join(dataDirectory, "media"),
);
export const defaultSettings: Settings = {
  name: "LinguaLocal",
  welcome: "A little practice. A world of possibilities.",
};

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
    const value = readFile(/* turbopackIgnore: true */ location, "utf8").then(
      (raw) => schema.parse(JSON.parse(raw)),
    );
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
export async function getContentState() {
  try {
    return { content: await getContent(), warning: "" };
  } catch (error) {
    console.error("Content needs repair", error);
    return {
      content: starterContent,
      warning:
        "The school’s content file could not be read. The starter collection is shown here while the school repairs content.json on the server. The original file remains on the server until you replace it.",
    };
  }
}
export async function atomicWrite(
  name: "content.json" | "settings.json",
  value: unknown,
) {
  await mkdir(dataDirectory, { recursive: true });
  const temporary = path.join(dataDirectory, `${name}.${randomUUID()}.tmp`);
  const handle = await open(temporary, "wx");
  try {
    await handle.writeFile(JSON.stringify(value));
    await handle.sync();
    await handle.close();
    await rename(
      temporary,
      path.join(/* turbopackIgnore: true */ dataDirectory, name),
    );
    documentCache.delete(name);
  } finally {
    await handle.close().catch(() => undefined);
    await unlink(temporary).catch(() => undefined);
  }
}
