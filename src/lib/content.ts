import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { packSchema, settingsSchema, type ContentPack, type Settings } from "./schema";
import seed from "@/content/starter.json";

export const dataDirectory = path.resolve(process.env.LINGUALOCAL_DATA_DIR || "data");
export const mediaDirectory = path.resolve(process.env.LINGUALOCAL_MEDIA_DIR || path.join(dataDirectory, "media"));
export const defaultSettings: Settings = { name: "LinguaLocal", welcome: "A little practice. A world of possibilities." };

async function readJson(name: string): Promise<unknown | null> {
  try { return JSON.parse(await readFile(path.join(dataDirectory, name), "utf8")); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new Error(`Unable to read ${name}. Check the data directory.`, { cause: error });
  }
}

export async function getContent(): Promise<ContentPack> {
  return packSchema.parse(await readJson("content.json") ?? seed);
}
export async function getSettings(): Promise<Settings> {
  return settingsSchema.parse(await readJson("settings.json") ?? defaultSettings);
}
export async function atomicWrite(name: "content.json" | "settings.json", value: unknown) {
  await mkdir(dataDirectory, { recursive: true });
  const temporary = path.join(dataDirectory, `${name}.${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify(value, null, 2));
  await rename(temporary, path.join(dataDirectory, name));
}
