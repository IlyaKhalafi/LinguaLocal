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
async function boundedResponse(
  response: Response,
  limit: number,
  deadlineAt = Infinity,
) {
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
      Math.max(
        1,
        Math.min(
          limit === MAX_MEDIA_BYTES ? 60_000 : 10_000,
          deadlineAt - Date.now(),
        ),
      ),
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
async function savePage(
  url: URL,
  response: Response,
  deadlineAt = Date.now() + 20_000,
) {
  if (!response.headers.get("Content-Type")?.includes("text/html")) return;
  const copy = await boundedResponse(response, MAX_PAGE_BYTES, deadlineAt);
  const html = await copy.clone().text();
  const locale = documentLocale(html);
  // A saved document needs its own chunks, including pages warmed before a visit.
  const references = [
    ...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/g),
  ]
    .map((match) => new URL(match[1].replaceAll("&amp;", "&"), url))
    .filter((asset) => assetAllowed(asset, worker.location.origin));
  const assets = [...new Set(references.map((asset) => asset.href))].slice(
    0,
    40,
  );
  for (let start = 0; start < assets.length; start += 4) {
    await Promise.all(
      assets.slice(start, start + 4).map(async (href) => {
        if (!(await settings()).enabled) return;
        if (await (await caches.open(assetsName)).match(href)) return;
        if (Date.now() >= deadlineAt) throw new Error("timeout");
        await saveAsset(
          new URL(href),
          await timedFetch(href, Math.min(5000, deadlineAt - Date.now())),
          deadlineAt,
        );
      }),
    );
  }
  await writeCaches(async () => {
    if (!(await settings()).enabled) return;
    const cache = await caches.open(pagesName);
    const key = offlinePageKey(url, locale);
    await cache.put(key, copy);
    const keys = await cache.keys();
    const candidates = keys.filter((entry) => {
      const url = new URL(entry.url);
      return url.pathname !== "/" || url.searchParams.size !== 1;
    });
    for (const entry of candidates.slice(
      0,
      Math.max(0, keys.length - MAX_CACHED_PAGES),
    ))
      await cache.delete(entry);
  });
}
async function saveAsset(url: URL, response: Response, deadlineAt = Infinity) {
  const copy = await boundedResponse(response, MAX_ASSET_BYTES, deadlineAt);
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
      throw new Error("asset-full");
    await cache.put(url.href, copy);
  });
}
async function timedFetch(request: Request | string, milliseconds = 5000) {
  const controller = new AbortController();
  const incoming = request instanceof Request ? request.signal : undefined;
  const cancelled = () => controller.abort();
  if (incoming?.aborted) cancelled();
  else incoming?.addEventListener("abort", cancelled, { once: true });
  const timeout = setTimeout(() => controller.abort(), milliseconds);
  try {
    return await fetch(request, {
      signal:
        incoming && typeof AbortSignal.any === "function"
          ? AbortSignal.any([controller.signal, incoming])
          : controller.signal,
    });
  } finally {
    clearTimeout(timeout);
    incoming?.removeEventListener("abort", cancelled);
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
function mediaSelection(data: Record<string, unknown>) {
  if (
    typeof data.url !== "string" ||
    (data.captions !== undefined && typeof data.captions !== "string")
  )
    throw new Error("unavailable");
  const urls = [new URL(data.url, worker.location.origin)];
  if (typeof data.captions === "string") {
    const caption = new URL(data.captions, worker.location.origin);
    if (!/\.vtt$/i.test(caption.pathname)) throw new Error("unavailable");
    if (caption.href !== urls[0].href) urls.push(caption);
  }
  if (urls.some((url) => !mediaAllowed(url, worker.location.origin)))
    throw new Error("unavailable");
  return urls;
}
async function deleteUnusedCaption(cache: Cache, href: string) {
  const shared = await Promise.all(
    (await cache.keys()).map(
      async (key) =>
        (await cache.match(key))?.headers.get("X-LinguaLocal-Captions") ===
        href,
    ),
  );
  if (!shared.some(Boolean)) await cache.delete(href);
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
        if (Date.now() >= deadline || !(await settings()).enabled) break;
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
            Math.max(1, Math.min(5000, deadline - Date.now())),
          );
          if (pageAllowed(url, worker.location.origin))
            await savePage(url, response, deadline);
          else await saveAsset(url, response, deadline);
        } catch {
          /* One unavailable resource does not discard other saved pages. */
        }
      }
      return status();
    }
    case "SAVE_MEDIA": {
      if (!config.enabled) throw new Error("disabled");
      const urls = mediaSelection(data);
      const entries = await mediaEntries();
      const existing = entries.filter((entry) =>
        urls.some((url) => url.href === entry.url),
      );
      if (entries.length - existing.length + urls.length > MAX_MEDIA_FILES)
        throw new Error("media-full");
      const deadline = Math.min(
        Date.now() + 65_000,
        typeof data.deadline === "number" && Number.isFinite(data.deadline)
          ? data.deadline
          : Infinity,
      );
      const copies: Response[] = [];
      for (const [index, url] of urls.entries()) {
        if (Date.now() >= deadline) throw new Error("timeout");
        const response = await timedFetch(
          new Request(url, { credentials: "same-origin", cache: "no-store" }),
          Math.max(1, Math.min(5000, deadline - Date.now())),
        );
        if (
          index &&
          response.headers.get("Content-Type")?.split(";")[0] !== "text/vtt"
        )
          throw new Error("unavailable");
        copies.push(
          await boundedResponse(
            response,
            index ? MAX_PAGE_BYTES : MAX_MEDIA_BYTES,
            deadline,
          ),
        );
      }
      if (urls[1])
        copies[0].headers.set("X-LinguaLocal-Captions", urls[1].href);
      const size = copies.reduce(
        (sum, copy) => sum + Number(copy.headers.get("Content-Length")),
        0,
      );
      if (
        entries.reduce((sum, entry) => sum + entry.bytes, 0) -
          existing.reduce((sum, entry) => sum + entry.bytes, 0) +
          size >
        MAX_MEDIA_TOTAL
      )
        throw new Error("media-full");
      const cache = await caches.open(mediaName);
      const originals = await Promise.all(
        urls.map((url) => cache.match(url.href)),
      );
      const written: number[] = [];
      try {
        for (const [index, url] of urls.entries()) {
          await cache.put(url.href, copies[index]);
          written.push(index);
        }
      } catch (error) {
        let rollbackFailed = false;
        for (const index of written.reverse()) {
          const original = originals[index];
          if (original)
            await cache.put(urls[index].href, original).catch(() => {
              rollbackFailed = true;
            });
          else
            await cache.delete(urls[index].href).catch(() => {
              rollbackFailed = true;
            });
        }
        if (rollbackFailed) throw new Error("partial-save");
        throw error;
      }
      const previousCaption = originals[0]?.headers.get(
        "X-LinguaLocal-Captions",
      );
      if (previousCaption && previousCaption !== urls[1]?.href)
        await deleteUnusedCaption(cache, previousCaption);
      return status();
    }
    case "REMOVE_MEDIA": {
      const urls = mediaSelection(data);
      const cache = await caches.open(mediaName);
      const storedCaption = (await cache.match(urls[0].href))?.headers.get(
        "X-LinguaLocal-Captions",
      );
      await cache.delete(urls[0].href);
      for (const href of new Set(
        [urls[1]?.href, storedCaption].filter((href): href is string =>
          Boolean(href),
        ),
      ))
        await deleteUnusedCaption(cache, href);
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
    (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc"))
  ) {
    event.respondWith(
      (async () => {
        if (!(await settings().catch(() => ({ enabled: false }))).enabled)
          return fetch(request);
        try {
          return await timedFetch(request, 12_000);
        } catch {
          if (
            !request.signal.aborted &&
            !request.headers.has("Next-Router-Prefetch") &&
            !request.headers.has("Next-Router-Segment-Prefetch") &&
            event.clientId
          ) {
            const destination = new URL(url);
            destination.searchParams.delete("_rsc");
            if (pageAllowed(destination, worker.location.origin)) {
              const client = await worker.clients.get(event.clientId);
              client?.postMessage({
                type: "NAVIGATION_OFFLINE",
                href: destination.href,
              });
            }
          }
          return Response.error();
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
