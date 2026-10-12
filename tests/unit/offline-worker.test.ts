import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function workerHarness(
  fetcher: typeof fetch,
  shortBodyTimeout = false,
  failPut?: (url: string) => boolean,
) {
  const callbacks = new Map<string, (event: Record<string, unknown>) => void>();
  const collections = new Map<string, Map<string, Response>>();
  const key = (input: string | Request) =>
    typeof input === "string" ? input : input.url;
  const cacheStorage = {
    async keys() {
      return [...collections.keys()];
    },
    async delete(name: string) {
      return collections.delete(name);
    },
    async open(name: string) {
      if (!collections.has(name)) collections.set(name, new Map());
      const entries = collections.get(name)!;
      return {
        async match(input: string | Request) {
          return entries.get(key(input))?.clone();
        },
        async put(input: string | Request, response: Response) {
          if (failPut?.(key(input))) throw new Error("Quota exceeded");
          entries.set(key(input), response.clone());
        },
        async delete(input: string | Request) {
          return entries.delete(key(input));
        },
        async keys() {
          return [...entries.keys()].map((url) => new Request(url));
        },
      };
    },
  };
  const source = [
    "src/lib/byte-range.ts",
    "src/lib/offline-policy.ts",
    "src/offline/service-worker.ts",
  ]
    .map((filename) =>
      ts
        .transpileModule(readFileSync(filename, "utf8"), {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
          },
        })
        .outputText.replace(/^import[\s\S]*?;\s*/gm, "")
        .replace(/^export /gm, ""),
    )
    .join("\n")
    .replace('"__LL_OFFLINE_PAGES__"', () =>
      JSON.stringify(JSON.stringify({ en: "Offline" })),
    );
  const context = vm.createContext({
    URL,
    Request,
    Response,
    Headers,
    Blob,
    Uint8Array,
    AbortController,
    AbortSignal,
    fetch: fetcher,
    caches: cacheStorage,
    location: { origin: "http://school.test" },
    clients: { claim: async () => {} },
    addEventListener: (
      name: string,
      callback: (event: Record<string, unknown>) => void,
    ) => callbacks.set(name, callback),
    setTimeout: (callback: () => void, milliseconds: number) =>
      setTimeout(
        callback,
        shortBodyTimeout && milliseconds >= 10000 ? 20 : milliseconds,
      ),
    clearTimeout,
  });
  vm.runInContext(source, context);
  async function command(data: Record<string, unknown>): Promise<{
    ok: boolean;
    value?: {
      enabled: boolean;
      pages: number;
      media: { url: string; bytes: number }[];
    };
    error?: string;
  }> {
    return new Promise((resolve) =>
      callbacks.get("message")!({
        data,
        ports: [{ postMessage: resolve }],
        waitUntil: () => {},
      }),
    );
  }
  async function navigate(url = "http://school.test/dictionary") {
    const pending: Promise<void>[] = [];
    let response: Promise<Response> | undefined;
    const request = new Request(url);
    Object.defineProperty(request, "mode", { value: "navigate" });
    callbacks.get("fetch")!({
      request,
      waitUntil: (promise: Promise<void>) => pending.push(promise),
      respondWith: (promise: Promise<Response>) => {
        response = promise;
      },
    });
    await response;
    return pending;
  }
  return { command, navigate };
}
test("clearing offline storage prevents an in-flight page save from restoring it", async () => {
  let finish!: () => void;
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('<html lang="en">School</html>'),
        );
        finish = () => controller.close();
      },
    }),
    { headers: { "Content-Type": "text/html" } },
  );
  const worker = workerHarness(async () => response);
  assert.equal(
    (await worker.command({ type: "ENABLE", locale: "en" })).ok,
    true,
  );
  const pending = await worker.navigate();
  assert.equal((await worker.command({ type: "DISABLE" })).ok, true);
  finish();
  await Promise.all(pending);
  const status = await worker.command({ type: "STATUS" });
  assert.equal(status.value?.enabled, false);
  assert.equal(status.value?.pages, 0);
});
test("a stalled media body times out and leaves later commands usable", async () => {
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
      },
    }),
  );
  const worker = workerHarness(async () => response, true);
  await worker.command({ type: "ENABLE", locale: "en" });
  const failed = await worker.command({
    type: "SAVE_MEDIA",
    url: "/api/media/book.wav",
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.error, "timeout");
  assert.equal((await worker.command({ type: "STATUS" })).ok, true);
  assert.equal(
    (await worker.command({ type: "DISABLE" })).value?.enabled,
    false,
  );
});

test("query variants of the home page stay within the page cache limit", async () => {
  const worker = workerHarness(
    async () =>
      new Response('<html lang="en">School</html>', {
        headers: { "Content-Type": "text/html" },
      }),
  );
  await worker.command({ type: "ENABLE", locale: "en" });
  await Promise.all(await worker.navigate("http://school.test/"));
  for (let index = 0; index < 40; index++)
    await Promise.all(
      await worker.navigate(`http://school.test/?page=${index}`),
    );
  assert.equal((await worker.command({ type: "STATUS" })).value?.pages, 30);
});

test("offline media and its captions are saved together or left unchanged", async () => {
  let captionsAvailable = false;
  const worker = workerHarness(async (request) => {
    const url =
      typeof request === "string"
        ? request
        : request instanceof URL
          ? request.href
          : request.url;
    return url.endsWith(".vtt") && !captionsAvailable
      ? new Response("Missing", { status: 404 })
      : new Response("Sample", {
          headers: {
            "Content-Type": url.endsWith(".vtt") ? "text/vtt" : "video/mp4",
          },
        });
  });
  await worker.command({ type: "ENABLE", locale: "en" });
  const selection = {
    url: "/api/media/book.mp4",
    captions: "/api/media/book.vtt",
  };
  assert.equal(
    (await worker.command({ type: "SAVE_MEDIA", ...selection })).ok,
    false,
  );
  assert.equal(
    (await worker.command({ type: "STATUS" })).value?.media.length,
    0,
  );
  captionsAvailable = true;
  assert.equal(
    (await worker.command({ type: "SAVE_MEDIA", ...selection })).ok,
    true,
  );
  assert.equal(
    (await worker.command({ type: "STATUS" })).value?.media.length,
    2,
  );
  const second = { url: "/api/media/other.mp4", captions: selection.captions };
  await worker.command({ type: "SAVE_MEDIA", ...second });
  await worker.command({ type: "REMOVE_MEDIA", ...selection });
  assert.equal(
    (await worker.command({ type: "STATUS" })).value?.media.length,
    2,
  );
  await worker.command({ type: "REMOVE_MEDIA", ...second });
  assert.equal(
    (await worker.command({ type: "STATUS" })).value?.media.length,
    0,
  );
  assert.equal(
    (
      await worker.command({
        type: "SAVE_MEDIA",
        url: selection.url,
        captions: "https://other.test/book.vtt",
      })
    ).ok,
    false,
  );
});

test("a failed caption replacement restores the previous playable pair", async () => {
  let fail = false;
  let content = "Before";
  const worker = workerHarness(
    async (request) => {
      const url =
        typeof request === "string"
          ? request
          : request instanceof URL
            ? request.href
            : request.url;
      return new Response(content, {
        headers: {
          "Content-Type": url.endsWith(".vtt") ? "text/vtt" : "video/mp4",
        },
      });
    },
    false,
    (url) => {
      if (fail && url.endsWith(".vtt")) {
        fail = false;
        return true;
      }
      return false;
    },
  );
  await worker.command({ type: "ENABLE", locale: "en" });
  const selection = {
    url: "/api/media/video.mp4",
    captions: "/api/media/captions.vtt",
  };
  await worker.command({ type: "SAVE_MEDIA", ...selection });
  content = "New";
  fail = true;
  assert.equal(
    (await worker.command({ type: "SAVE_MEDIA", ...selection })).ok,
    false,
  );
  const entries = (await worker.command({ type: "STATUS" })).value!.media;
  assert.equal(entries.length, 2);
  assert.ok(entries.every((entry) => entry.bytes === 6));
  await worker.command({
    type: "SAVE_MEDIA",
    ...selection,
    captions: "/api/media/revised.vtt",
  });
  const revised = (await worker.command({ type: "STATUS" })).value!.media;
  assert.equal(revised.length, 2);
  assert.ok(!revised.some((entry) => entry.url.endsWith("/captions.vtt")));
  await worker.command({ type: "REMOVE_MEDIA", url: selection.url });
  assert.equal(
    (await worker.command({ type: "STATUS" })).value!.media.length,
    0,
  );
});

test("changing an unshared caption at capacity replaces one selection", async () => {
  const worker = workerHarness(async (request) => {
    const url =
      typeof request === "string"
        ? request
        : request instanceof URL
          ? request.href
          : request.url;
    return new Response("File", {
      headers: {
        "Content-Type": url.endsWith(".vtt") ? "text/vtt" : "audio/wav",
      },
    });
  });
  await worker.command({ type: "ENABLE", locale: "en" });
  const selection = {
    url: "/api/media/lesson.mp4",
    captions: "/api/media/first.vtt",
  };
  await worker.command({ type: "SAVE_MEDIA", ...selection });
  for (let index = 0; index < 10; index++)
    await worker.command({
      type: "SAVE_MEDIA",
      url: `/api/media/audio-${index}.wav`,
    });
  assert.equal(
    (await worker.command({ type: "STATUS" })).value!.media.length,
    12,
  );
  assert.equal(
    (
      await worker.command({
        type: "SAVE_MEDIA",
        ...selection,
        captions: "/api/media/revised.vtt",
      })
    ).ok,
    true,
  );
  assert.equal(
    (await worker.command({ type: "STATUS" })).value!.media.length,
    12,
  );
});
