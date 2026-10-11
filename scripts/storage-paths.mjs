import path from "node:path";

export function storagePaths(env = process.env) {
  const dataDirectory = path.resolve(
    /* turbopackIgnore: true */ env.LINGUALOCAL_DATA_DIR || "data",
  );
  const mediaDirectory = path.resolve(
    /* turbopackIgnore: true */
    env.LINGUALOCAL_MEDIA_DIR || path.join(dataDirectory, "media"),
  );
  return { dataDirectory, mediaDirectory };
}
