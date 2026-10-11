import { link, mkdir, open, rename, unlink, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export async function writeFileAtomically(
  file: string,
  value: string | Uint8Array,
  options: { overwrite?: boolean } = {},
) {
  const directory = path.dirname(file);
  await mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `.lingualocal-${randomUUID()}.tmp`);
  const handle = await open(temporary, "wx");
  try {
    if (options.overwrite !== false) {
      try {
        await handle.chmod(
          (await stat(/* turbopackIgnore: true */ file)).mode & 0o777,
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    await handle.writeFile(value);
    await handle.sync();
    await handle.close();
    if (options.overwrite === false)
      await link(temporary, /* turbopackIgnore: true */ file);
    else await rename(temporary, /* turbopackIgnore: true */ file);
  } finally {
    await handle.close().catch(() => undefined);
    await unlink(temporary).catch(() => undefined);
  }
}
