import { createHash } from "node:crypto";
import { createReadStream, constants } from "node:fs";
import {
  copyFile,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rm,
} from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  packSchema,
  settingsSchema,
  type ContentPack,
  type Settings,
} from "./schema";
import { readValidatedJson, writeJsonAtomically } from "./json-file";
import { resolveMediaFile } from "./media-files";
import type { Stats } from "node:fs";

const manifestLimit = 16 * 1024 * 1024;
const fileName = z
  .string()
  .min(1)
  .max(400)
  .refine(
    (value) =>
      !path.isAbsolute(value) &&
      !/[\\\x00:]/.test(value) &&
      value
        .split("/")
        .every((segment) => segment && segment !== "." && segment !== ".."),
  );
const manifestSchema = z
  .object({
    version: z.literal(1),
    created: z.iso.datetime(),
    files: z
      .array(
        z.object({
          file: fileName,
          bytes: z.number().int().nonnegative(),
          sha256: z.string().regex(/^[a-f0-9]{64}$/),
        }),
      )
      .min(2)
      .max(50000),
  })
  .superRefine((manifest, context) => {
    const names = manifest.files.map((file) => file.file);
    if (
      new Set(names).size !== names.length ||
      !names.includes("content.json") ||
      !names.includes("settings.json") ||
      names.some(
        (name) =>
          !["content.json", "settings.json"].includes(name) &&
          !name.startsWith("media/"),
      )
    )
      context.addIssue({
        code: "custom",
        message: "Invalid snapshot file inventory",
      });
  });
type Manifest = z.infer<typeof manifestSchema>;
type Roots = {
  dataDirectory: string;
  mediaDirectory: string;
  bundledDirectory: string;
};
function contains(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return (
    !relative ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}
async function canonical(file: string): Promise<string> {
  try {
    return await realpath(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return path.join(await canonical(path.dirname(file)), path.basename(file));
  }
}
async function freshDestination(destination: string, sources: string[]) {
  const target = await canonical(path.resolve(destination));
  for (const source of sources)
    if (contains(await canonical(path.resolve(source)), target))
      throw new Error("Choose a destination outside the source directories.");
  await mkdir(path.dirname(target), { recursive: true });
  await mkdir(target);
  return target;
}
async function regularFiles(root: string): Promise<string[]> {
  const result: string[] = [];
  async function walk(directory: string) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code === "ENOENT" &&
        directory === root
      )
        return;
      throw error;
    }
    for (const entry of entries) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink())
        throw new Error(
          `Move linked media into the media directory before taking a snapshot. ${file}`,
        );
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile())
        result.push(path.relative(root, file).split(path.sep).join("/"));
      else throw new Error(`Snapshot media must be regular files. ${file}`);
      if (result.length > 49998)
        throw new Error("Snapshot contains too many files.");
    }
  }
  await walk(root);
  return result.sort();
}
async function checksum(file: string) {
  const info = await lstat(file);
  if (!info.isFile())
    throw new Error(`Snapshot entry must be a regular file. ${file}`);
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of createReadStream(file)) {
    bytes += chunk.length;
    hash.update(chunk);
  }
  return { bytes, sha256: hash.digest("hex") };
}
async function documentOrDefault<T>(
  file: string,
  schema: z.ZodType<T>,
  fallback: T,
) {
  let info: Stats;
  try {
    info = await lstat(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return {
        data: schema.parse(fallback),
        source: undefined,
        stamp: undefined,
      };
    throw error;
  }
  return {
    data: await readValidatedJson(file, schema),
    source: file,
    stamp: signature(info),
  };
}
function signature(info: Stats) {
  return `${info.dev}:${info.ino}:${info.size}:${info.mtimeMs}:${info.ctimeMs}`;
}
async function copy(source: string, target: string, expected?: string) {
  const before = await lstat(source);
  if (!before.isFile() || (expected && signature(before) !== expected))
    throw new Error(`Source changed while taking the snapshot. ${source}`);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target, constants.COPYFILE_EXCL);
  const handle = await open(target, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
  if (signature(await lstat(source)) !== signature(before))
    throw new Error(`Source changed while copying. ${source}`);
  return signature(before);
}
export async function createServerSnapshot(
  roots: Roots,
  destination: string,
  defaults: { content: ContentPack; settings: Settings },
) {
  const contentDocument = await documentOrDefault(
    path.join(roots.dataDirectory, "content.json"),
    packSchema,
    defaults.content,
  );
  const settingsDocument = await documentOrDefault(
    path.join(roots.dataDirectory, "settings.json"),
    settingsSchema,
    defaults.settings,
  );
  const content = contentDocument.data;
  const media = new Map(
    (await regularFiles(roots.mediaDirectory)).map((file) => [
      file,
      path.join(roots.mediaDirectory, file),
    ]),
  );
  for (const book of content.books)
    for (const resource of book.resources)
      for (const file of [resource.file, resource.captions].filter(
        (file): file is string => Boolean(file),
      )) {
        const resolved = await resolveMediaFile(file.split("/"), [
          roots.mediaDirectory,
          roots.bundledDirectory,
        ]);
        if (!resolved || !resolved.info.size)
          throw new Error(`Required media is missing or empty. ${file}`);
        media.set(file, resolved.file);
      }
  for (const file of media.keys()) fileName.parse(`media/${file}`);
  if (media.size > 49998) throw new Error("Snapshot contains too many files.");
  const target = await freshDestination(destination, Object.values(roots));
  try {
    const sources = new Map<string, string>();
    const documents = [
      { name: "content.json", ...contentDocument },
      { name: "settings.json", ...settingsDocument },
    ];
    for (const document of documents) {
      const output = path.join(target, document.name);
      if (document.source)
        sources.set(
          document.source,
          await copy(document.source, output, document.stamp),
        );
      else
        await writeJsonAtomically(output, document.data, { overwrite: false });
    }
    for (const [file, source] of media) {
      sources.set(source, await copy(source, path.join(target, "media", file)));
    }
    const names = [
      "content.json",
      "settings.json",
      ...[...media.keys()].map((file) => `media/${file}`),
    ].sort();
    const files: Manifest["files"] = [];
    for (const file of names)
      files.push({ file, ...(await checksum(path.join(target, file))) });
    for (const [source, stamp] of sources)
      if (signature(await lstat(source)) !== stamp)
        throw new Error(`Source changed while taking the snapshot. ${source}`);
    const manifest = manifestSchema.parse({
      version: 1,
      created: new Date().toISOString(),
      files,
    });
    if (Buffer.byteLength(JSON.stringify(manifest)) > manifestLimit)
      throw new Error("Snapshot inventory exceeds the size limit.");
    await writeJsonAtomically(path.join(target, "snapshot.json"), manifest, {
      overwrite: false,
    });
    return {
      directory: target,
      files: files.length,
      bytes: files.reduce((sum, file) => sum + file.bytes, 0),
      dataDirectory: path.resolve(roots.dataDirectory),
      mediaDirectory: path.resolve(roots.mediaDirectory),
      defaults: documents
        .filter((document) => !document.source)
        .map((document) => document.name),
    };
  } catch (error) {
    await rm(target, { recursive: true, force: true });
    throw error;
  }
}
export async function restoreServerSnapshot(
  source: string,
  destination: string,
  protectedDirectories: string[] = [],
) {
  const root = await realpath(source);
  const manifest = await readValidatedJson(
    path.join(root, "snapshot.json"),
    manifestSchema,
    manifestLimit,
  );
  for (const file of manifest.files) {
    const resolved = await realpath(path.join(root, file.file));
    if (
      !contains(root, resolved) ||
      !(await lstat(path.join(root, file.file))).isFile()
    )
      throw new Error(
        `Snapshot entry is linked or outside the snapshot. ${file.file}`,
      );
    const actual = await checksum(resolved);
    if (actual.bytes !== file.bytes || actual.sha256 !== file.sha256)
      throw new Error(`Snapshot file failed its checksum. ${file.file}`);
  }
  await readValidatedJson(path.join(root, "settings.json"), settingsSchema);
  const content = await readValidatedJson(
    path.join(root, "content.json"),
    packSchema,
  );
  const inventory = new Set(manifest.files.map((file) => file.file));
  for (const book of content.books)
    for (const resource of book.resources)
      for (const file of [resource.file, resource.captions].filter(
        (file): file is string => Boolean(file),
      ))
        if (!inventory.has(`media/${file}`))
          throw new Error(`Snapshot is missing required media. ${file}`);
  const target = await freshDestination(destination, [
    root,
    ...protectedDirectories,
  ]);
  try {
    for (const file of manifest.files) {
      const origin = path.join(root, file.file),
        output = path.join(target, file.file);
      await copy(origin, output);
      const actual = await checksum(output);
      if (actual.bytes !== file.bytes || actual.sha256 !== file.sha256)
        throw new Error(`Snapshot changed while restoring. ${file.file}`);
    }
    return { directory: target, files: manifest.files.length };
  } catch (error) {
    await rm(target, { recursive: true, force: true });
    throw error;
  }
}
