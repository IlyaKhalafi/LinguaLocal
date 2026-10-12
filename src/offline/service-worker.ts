/// <reference lib="webworker" />
import {
  OFFLINE_PREFIX,
  OFFLINE_CONFIG,
  MAX_CACHED_PAGES,
  MAX_PAGE_BYTES,
  MAX_ASSET_BYTES,
  MAX_ASSET_TOTAL,
  MAX_ASSET_FILES,
  MAX_MEDIA_BYTES,
  MAX_MEDIA_TOTAL,
  MAX_MEDIA_FILES,
  pageAllowed,
  assetAllowed,
  mediaAllowed,
  offlineLocale,
  documentLocale,
  offlinePageKey,
  byteRange,
} from "../lib/offline-policy";
const worker = globalThis as unknown as ServiceWorkerGlobalScope;
const BUILD_ID = "__LL_BUILD_ID__";
const OFFLINE_PAGES: Record<string, string> = JSON.parse(
  "__LL_OFFLINE_PAGES__",
);
const pagesName = `${OFFLINE_PREFIX}-${BUILD_ID}-pages`;
const assetsName = `${OFFLINE_PREFIX}-${BUILD_ID}-assets`;
// Explicitly selected media survives an application update.
const mediaName = `${OFFLINE_PREFIX}-media`;
const settingsUrl = new URL("/__ll_offline_settings", worker.location.origin)
  .href;
type Settings = { enabled: boolean; locale: string };
let settingsPromise: Promise<Settings> | undefined;
let commands = Promise.resolve();
let cacheWrites = Promise.resolve();
function writeCaches(action: () => Promise<void>) {
  const pending = cacheWrites.catch(() => {}).then(action);
  cacheWrites = pending.catch(() => {});
  return pending;
}
async function settings(): Promise<Settings> {
  return (settingsPromise ??= (async () => {
    const cached = await (await caches.open(OFFLINE_CONFIG)).match(settingsUrl);
    if (!cached) return { enabled: false, locale: "en" };
    try {
      const value = await cached.json();
      return {
        enabled: value.enabled === true,
        locale: offlineLocale(value.locale),
      };
    } catch {
      return { enabled: false, locale: "en" };
    }
  })().catch((error) => {
    settingsPromise = undefined;
    throw error;
  }));
}
async function saveSettings(value: Settings) {
  await (
    await caches.open(OFFLINE_CONFIG)
  ).put(
    settingsUrl,
    new Response(JSON.stringify(value), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  settingsPromise = Promise.resolve(value);
}
async function boundedResponse(response: Response, limit: number) {
  if (
    !response.ok ||
    response.status !== 200 ||
    response.redirected ||
    !response.body
  )
    throw new Error("unavailable");
  const declared = Number(response.headers.get("Content-Length"));
  if (declared > limit) throw new Error("too-large");
  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  let timeout: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error("timeout")),
      limit === MAX_MEDIA_BYTES ? 60_000 : 10_000,
    );
  });
  try {
    for (;;) {
      const part = await Promise.race([reader.read(), deadline]);
      if (part.done) break;
      size += part.value.byteLength;
      if (size > limit) throw new Error("too-large");
      chunks.push(part.value as Uint8Array<ArrayBuffer>);
    }
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    clearTimeout(timeout!);
  }
  const headers = new Headers(response.headers);
  headers.delete("Content-Encoding");
  headers.set("Content-Length", String(size));
  return new Response(new Blob(chunks), { headers, status: 200 });
}
async function savePage(url: URL, response: Response) {
  if (!response.headers.get("Content-Type")?.includes("text/html")) return;
  const copy = await boundedResponse(response, MAX_PAGE_BYTES);
  const locale = documentLocale(await copy.clone().text());
  await writeCaches(async () => {
    if (!(await settings()).enabled) return;
    const cache = await caches.open(pagesName);
    const key = offlinePageKey(url, locale);
    await cache.put(key, copy);
    const keys = await cache.keys();
    const candidates = keys.filter(
      (entry) => new URL(entry.url).pathname !== "/",
    );
    for (const entry of candidates.slice(
      0,
      Math.max(0, keys.length - MAX_CACHED_PAGES),
    ))
      await cache.delete(entry);
  });
}
async function saveAsset(url: URL, response: Response) {
  const copy = await boundedResponse(response, MAX_ASSET_BYTES);
  await writeCaches(async () => {
    if (!(await settings()).enabled) return;
    const cache = await caches.open(assetsName);
    const keys = await cache.keys();
    let total = 0;
    for (const key of keys) {
      if (key.url !== url.href)
        total +=
          Number((await cache.match(key))?.headers.get("Content-Length")) || 0;
    }
    if (
      total + Number(copy.headers.get("Content-Length")) > MAX_ASSET_TOTAL ||
      (keys.length >= MAX_ASSET_FILES &&
        !keys.some((key) => key.url === url.href))
    )
      return;
    await cache.put(url.href, copy);
  });
}
async function timedFetch(request: Request | string, milliseconds = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), milliseconds);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
async function mediaEntries() {
  const cache = await caches.open(mediaName);
  const keys = await cache.keys();
  const entries = [];
  for (const key of keys) {
    const response = await cache.match(key);
    if (response)
      entries.push({
        url: key.url,
        bytes: Number(response.headers.get("Content-Length")) || 0,
      });
  }
  return entries;
}
async function status() {
  const value = await settings();
  return {
    enabled: value.enabled,
    pages: (await (await caches.open(pagesName)).keys()).length,
    media: await mediaEntries(),
  };
}
async function handleCommand(data: Record<string, unknown>) {
  const config = await settings();
  switch (data.type) {
    case "STATUS":
      return status();
    case "ENABLE":
      await saveSettings({ enabled: true, locale: offlineLocale(data.locale) });
      return status();
    case "LOCALE":
      if (config.enabled)
        await saveSettings({ ...config, locale: offlineLocale(data.locale) });
      return status();
    case "DISABLE": {
      await saveSettings({ enabled: false, locale: config.locale });
      await writeCaches(async () => {
        const names = await caches.keys();
        for (const name of names)
          if (name.startsWith(OFFLINE_PREFIX + "-") && name !== OFFLINE_CONFIG)
            await caches.delete(name);
      });
      return status();
    }
    case "WARM": {
      if (!config.enabled) throw new Error("disabled");
      const urls = Array.isArray(data.urls) ? data.urls.slice(0, 240) : [];
      const deadline = Date.now() + 20_000;
      let pageCount = 0;
      for (const item of urls) {
        if (Date.now() > deadline) break;
        if (typeof item !== "string") continue;
        const url = new URL(item, worker.location.origin);
        if (
          !pageAllowed(url, worker.location.origin) &&
          !assetAllowed(url, worker.location.origin)
        )
          continue;
        if (
          pageAllowed(url, worker.location.origin) &&
          ++pageCount > MAX_CACHED_PAGES
        )
          continue;
        if (
          assetAllowed(url, worker.location.origin) &&
          (await (await caches.open(assetsName)).match(url.href))
        )
          continue;
        try {
          const response = await timedFetch(
            new Request(url, { credentials: "same-origin" }),
          );
          if (pageAllowed(url, worker.location.origin))
            await savePage(url, response);
          else await saveAsset(url, response);
        } catch {
          /* One unavailable resource does not discard other saved pages. */
        }
      }
      return status();
    }
    case "SAVE_MEDIA": {
      if (!config.enabled || typeof data.url !== "string")
        throw new Error("disabled");
      const url = new URL(data.url, worker.location.origin);
      if (!mediaAllowed(url, worker.location.origin))
        throw new Error("unavailable");
      const entries = await mediaEntries();
      const existing = entries.find((entry) => entry.url === url.href);
      if (!existing && entries.length >= MAX_MEDIA_FILES)
        throw new Error("media-full");
      const response = await timedFetch(
        new Request(url, { credentials: "same-origin", cache: "no-store" }),
      );
      const copy = await boundedResponse(response, MAX_MEDIA_BYTES);
      const size = Number(copy.headers.get("Content-Length"));
      if (
        entries.reduce((sum, entry) => sum + entry.bytes, 0) -
          (existing?.bytes ?? 0) +
          size >
        MAX_MEDIA_TOTAL
      )
        throw new Error("media-full");
      await (await caches.open(mediaName)).put(url.href, copy);
      return status();
    }
    case "REMOVE_MEDIA": {
      if (typeof data.url !== "string") throw new Error("unavailable");
      const url = new URL(data.url, worker.location.origin);
      if (!mediaAllowed(url, worker.location.origin))
        throw new Error("unavailable");
      await (await caches.open(mediaName)).delete(url.href);
      return status();
    }
    default:
      throw new Error("unsupported");
  }
}
worker.addEventListener("install", () => {
  /* Updates wait until existing tabs close. */
});
worker.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      for (const name of names)
        if (
          name.startsWith(OFFLINE_PREFIX + "-") &&
          ![OFFLINE_CONFIG, mediaName, pagesName, assetsName].includes(name)
        )
          await caches.delete(name);
      await worker.clients.claim();
    })(),
  );
});
worker.addEventListener("message", (event) => {
  if (!event.ports[0] || !event.data || typeof event.data.type !== "string")
    return;
  commands = commands
    .catch(() => {})
    .then(async () => {
      try {
        event.ports[0].postMessage({
          ok: true,
          value: await handleCommand(event.data),
        });
      } catch (error) {
        try {
          event.ports[0].postMessage({
            ok: false,
            error: error instanceof Error ? error.message : "unavailable",
          });
        } catch {
          /* A closed client cannot poison later commands. */
        }
      }
    });
  event.waitUntil(commands);
});
async function cachedMedia(request: Request, cached: Response) {
  const ifRange = request.headers.get("If-Range");
  if (
    !request.headers.has("Range") ||
    (ifRange &&
      ifRange !== cached.headers.get("Last-Modified") &&
      ifRange !== cached.headers.get("ETag"))
  )
    return request.method === "HEAD"
      ? new Response(null, { headers: cached.headers })
      : cached;
  const size = Number(cached.headers.get("Content-Length"));
  const range = byteRange(request.headers.get("Range")!, size);
  if (!range)
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  const headers = new Headers(cached.headers);
  headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
  headers.set("Content-Length", String(range.end - range.start + 1));
  headers.set("Accept-Ranges", "bytes");
  const body =
    request.method === "HEAD"
      ? null
      : (await cached.blob()).slice(range.start, range.end + 1);
  return new Response(body, {
    status: 206,
    headers,
  });
}
worker.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    !["GET", "HEAD"].includes(request.method) ||
    url.origin !== worker.location.origin
  )
    return;
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const config = await settings().catch(() => ({
          enabled: false,
          locale: "en",
        }));
        if (!config.enabled) return fetch(request);
        try {
          const response = await timedFetch(request, 12_000);
          if (response.status >= 500) {
            return (
              (await (
                await caches.open(pagesName)
              )
                .match(offlinePageKey(url, config.locale))
                .catch(() => undefined)) ?? response
            );
          }
          if (pageAllowed(url, worker.location.origin))
            event.waitUntil(savePage(url, response.clone()).catch(() => {}));
          return response;
        } catch {
          return (
            (await (
              await caches.open(pagesName)
            ).match(offlinePageKey(url, config.locale))) ??
            new Response(OFFLINE_PAGES[offlineLocale(config.locale)], {
              status: 503,
              headers: { "Content-Type": "text/html;charset=utf-8" },
            })
          );
        }
      })(),
    );
  } else if (
    request.method === "GET" &&
    assetAllowed(url, worker.location.origin)
  ) {
    event.respondWith(
      (async () => {
        if (!(await settings().catch(() => ({ enabled: false }))).enabled)
          return fetch(request);
        const cache = await caches.open(assetsName);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        event.waitUntil(saveAsset(url, response.clone()).catch(() => {}));
        return response;
      })(),
    );
  } else if (mediaAllowed(url, worker.location.origin)) {
    event.respondWith(
      (async () => {
        if (!(await settings().catch(() => ({ enabled: false }))).enabled)
          return fetch(request);
        const cached = await (await caches.open(mediaName)).match(url.href);
        return cached ? cachedMedia(request, cached) : fetch(request);
      })(),
    );
  }
});
