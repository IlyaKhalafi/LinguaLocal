import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
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

async function readJson(name: string): Promise<unknown | null> {
  try {
    return JSON.parse(
      await readFile(
        /* turbopackIgnore: true */ path.join(
          /* turbopackIgnore: true */ dataDirectory,
          name,
        ),
        "utf8",
      ),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new Error(`Unable to read ${name}. Check the data directory.`, {
      cause: error,
    });
  }
}

export async function getContent(): Promise<ContentPack> {
  return packSchema.parse((await readJson("content.json")) ?? seed);
}
export async function getSettings(): Promise<Settings> {
  return settingsSchema.parse(
    (await readJson("settings.json")) ?? defaultSettings,
  );
}
export async function getSettingsState() {
  try {
    return { settings: await getSettings(), warning: "" };
  } catch (error) {
    console.error("Settings need repair", error);
    return {
      settings: defaultSettings,
      warning:
        "The school settings file could not be read. Save your welcome in School settings to repair it.",
    };
  }
}
export async function getContentState() {
  try {
    return { content: await getContent(), warning: "" };
  } catch (error) {
    console.error("Content needs repair", error);
    return {
      content: packSchema.parse(seed),
      warning:
        "The school’s content file could not be read. The starter collection is shown here so you can import a valid backup to repair it. The original file remains on the server until you replace it.",
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
  } finally {
    await handle.close().catch(() => undefined);
    await unlink(temporary).catch(() => undefined);
  }
}
