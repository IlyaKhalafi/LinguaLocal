"use client";
import { assetAllowed, pageAllowed } from "./offline-policy";
import { LOCALE_COOKIE, parseLocale, type Locale } from "./locale";
export type OfflineStatus = {
  enabled: boolean;
  pages: number;
  media: { url: string; bytes: number }[];
};
type Snapshot = OfflineStatus & {
  ready: boolean;
  capability: "loading" | "supported" | "insecure" | "unsupported";
  busy: boolean;
  error: string;
  installReady: boolean;
  errorAction?: "refresh" | "warm" | "remove" | "install";
};
const initial: Snapshot = {
  enabled: false,
  pages: 0,
  media: [],
  ready: false,
  capability: "loading",
  busy: false,
  error: "",
  installReady: false,
};
let snapshot = initial;
const listeners = new Set<() => void>();
let registration: ServiceWorkerRegistration | undefined;
let refreshing: Promise<void> | undefined;
let warming: Promise<void> | undefined;
let generation = 0;
let warmingKey = "";
let pendingWarm: { locale: Locale; key: string } | undefined;
export type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
let installPrompt: InstallPrompt | undefined;
export const offlineServerSnapshot = () => initial;
export const offlineSnapshot = () => snapshot;
export function subscribeOffline(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function update(patch: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener();
}
function supported() {
  return (
    window.isSecureContext && "serviceWorker" in navigator && "caches" in window
  );
}
function belongsToApp(candidate: ServiceWorkerRegistration) {
  return [candidate.active, candidate.waiting, candidate.installing].some(
    (worker) =>
      worker && new URL(worker.scriptURL).pathname === "/service-worker.js",
  );
}
async function command(
  data: Record<string, unknown>,
  timeout = 45_000,
  target = registration,
): Promise<OfflineStatus> {
  const worker = target?.active;
  if (!worker) throw new Error("unavailable");
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      reject(new Error("timeout"));
    }, timeout);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      if (event.data?.ok) resolve(event.data.value);
      else reject(new Error(event.data?.error ?? "unavailable"));
    };
    try {
      worker.postMessage(data, [channel.port2]);
    } catch (error) {
      clearTimeout(timer);
      channel.port1.close();
      reject(error);
    }
  });
}
export function refreshOffline() {
  return (refreshing ??= (async () => {
    const started = generation;
    if (!supported()) {
      update({
        ready: true,
        capability: window.isSecureContext ? "unsupported" : "insecure",
        enabled: false,
      });
      return;
    }
    try {
      const found = await navigator.serviceWorker.getRegistration("/");
      const candidate = found && belongsToApp(found) ? found : undefined;
      const status = candidate?.active
        ? await command({ type: "STATUS" }, 45_000, candidate)
        : undefined;
      if (started !== generation || snapshot.busy) return;
      registration = candidate;
      const recovered =
        snapshot.errorAction === "refresh"
          ? { error: "", errorAction: undefined }
          : {};
      if (status)
        update({
          ...status,
          ...recovered,
          ready: true,
          capability: "supported",
        });
      else
        update({
          ready: true,
          capability: "supported",
          enabled: false,
          pages: 0,
          media: [],
          ...recovered,
        });
    } catch {
      if (started !== generation || snapshot.busy) return;
      update({
        ready: true,
        capability: "supported",
        error: "Offline storage is unavailable. Try again.",
        errorAction: "refresh",
      });
    }
  })().finally(() => {
    refreshing = undefined;
  }));
}
export function openOfflineChannel() {
  try {
    return "BroadcastChannel" in window
      ? new BroadcastChannel("lingualocal-offline")
      : undefined;
  } catch {
    return undefined;
  }
}
function announceChange() {
  window.dispatchEvent(new Event("lingualocal:offlinechange"));
  const channel = openOfflineChannel();
  channel?.postMessage("changed");
  channel?.close();
}
export async function setOfflineLocale(locale: Locale) {
  await refreshOffline();
  if (!registration?.active) throw new Error("unavailable");
  update(await command({ type: "LOCALE", locale }));
}
async function warm(locale: Locale) {
  try {
    const cookie = document.cookie
      .split("; ")
      .find((value) => value.startsWith(LOCALE_COOKIE + "="));
    if (cookie) locale = parseLocale(cookie.slice(LOCALE_COOKIE.length + 1));
  } catch {
    /* Current tab language works when cookies are unavailable. */
  }
  await command({ type: "LOCALE", locale });
  if (!navigator.onLine) return;
  await document.fonts.ready;
  const urls = [
    ...new Set([
      "/",
      location.href,
      "/icon.svg",
      "/icons/app-192.png",
      "/icons/app-512.png",
      ...performance.getEntriesByType("resource").map((entry) => entry.name),
    ]),
  ].filter((input) => {
    const url = new URL(input, location.origin);
    return (
      pageAllowed(url, location.origin) || assetAllowed(url, location.origin)
    );
  });
  update(await command({ type: "WARM", urls }));
}
export function warmOffline(locale: Locale) {
  if (!snapshot.enabled || snapshot.busy) return Promise.resolve();
  const key = locale + location.href;
  if (warming && key === warmingKey) return warming;
  pendingWarm = { locale, key };
  return (warming ??= (async () => {
    while (pendingWarm && snapshot.enabled && !snapshot.busy) {
      const next = pendingWarm;
      pendingWarm = undefined;
      warmingKey = next.key;
      await warm(next.locale).catch(() => {});
    }
  })().finally(() => {
    warming = undefined;
    warmingKey = "";
  }));
}
async function waitForActive(candidate: ServiceWorkerRegistration) {
  if (candidate.active) return;
  await new Promise<void>((resolve, reject) => {
    const worker = candidate.installing ?? candidate.waiting;
    if (!worker) {
      reject(new Error("unavailable"));
      return;
    }
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("timeout"));
    }, 15_000);
    function cleanup() {
      clearTimeout(timer);
      worker!.removeEventListener("statechange", changed);
    }
    function changed() {
      if (worker!.state === "activated") {
        cleanup();
        resolve();
      } else if (worker!.state === "redundant") {
        cleanup();
        reject(new Error("unavailable"));
      }
    }
    worker.addEventListener("statechange", changed);
    changed();
  });
}
export async function enableOffline(locale: Locale) {
  if (snapshot.busy) return;
  generation++;
  update({ busy: true, error: "", errorAction: undefined });
  try {
    if (!supported()) throw new Error("unavailable");
    registration = await navigator.serviceWorker.register(
      "/service-worker.js",
      { scope: "/", updateViaCache: "none" },
    );
    await waitForActive(registration);
    update(await command({ type: "ENABLE", locale }));
    await warm(locale);
    if (!snapshot.pages) throw new Error("unavailable");
    announceChange();
  } catch {
    update({
      error: "Offline storage is unavailable. Try again.",
      errorAction: "warm",
    });
  } finally {
    update({ busy: false });
  }
}
export async function removeOffline() {
  if (snapshot.busy) return;
  generation++;
  update({ busy: true, error: "", errorAction: undefined });
  try {
    update(await command({ type: "DISABLE" }));
    await registration?.unregister();
    registration = undefined;
    announceChange();
  } catch {
    update({
      error: "Unable to remove offline copies. Try again.",
      errorAction: "remove",
    });
  } finally {
    update({ busy: false });
  }
}
export async function retryOffline(locale: Locale) {
  if (snapshot.busy) return;
  if (snapshot.errorAction === "remove") return removeOffline();
  if (snapshot.errorAction === "refresh") return refreshOffline();
  generation++;
  update({ busy: true, error: "", errorAction: undefined });
  try {
    if (!navigator.onLine) throw new Error("unavailable");
    await warm(locale);
    if (!snapshot.pages) throw new Error("unavailable");
  } catch {
    update({
      error: "Offline storage is unavailable. Try again.",
      errorAction: "warm",
    });
  } finally {
    update({ busy: false });
  }
}
export async function changeOfflineMedia(url: string, save: boolean) {
  if (snapshot.busy) throw new Error("busy");
  generation++;
  update({ busy: true });
  try {
    update(
      await command(
        { type: save ? "SAVE_MEDIA" : "REMOVE_MEDIA", url },
        75_000,
      ),
    );
    announceChange();
  } finally {
    update({ busy: false });
  }
}
export function offerInstall(event: InstallPrompt) {
  event.preventDefault();
  installPrompt = event;
  update({ installReady: true });
}
export function installedApp() {
  installPrompt = undefined;
  update({ installReady: false });
}
export async function installApp() {
  const event = installPrompt;
  if (!event) return;
  installedApp();
  try {
    await event.prompt();
    await event.userChoice;
  } catch {
    update({
      error: "Use your browser’s install option to add this app.",
      errorAction: "install",
    });
  }
}
