"use client";
import { useEffect, useEffectEvent, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLocale } from "./locale-provider";
import { usePreferences } from "./preferences-provider";
import { PREFERENCES_COOKIE, parsePreferences } from "@/lib/preferences";
import { useOffline } from "@/lib/use-offline";
import {
  refreshOffline,
  warmOffline,
  openOfflineChannel,
  offlineSnapshot,
  offerInstall,
  installedApp,
  type InstallPrompt,
} from "@/lib/offline-client";
import { pageAllowed, offlineNavigationKey } from "@/lib/offline-policy";
export function OfflineBridge() {
  const { locale } = useLocale();
  const state = useOffline();
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const requestedNavigation = useRef<{ href: string; at: number } | undefined>(
    undefined,
  );
  const { preferences, change } = usePreferences();
  const reconcilePreferences = useEffectEvent(() => {
    try {
      const cookie = document.cookie
        .split("; ")
        .find((value) => value.startsWith(PREFERENCES_COOKIE + "="));
      if (cookie) {
        const saved = parsePreferences(
          cookie.slice(PREFERENCES_COOKIE.length + 1),
        );
        if (JSON.stringify(saved) !== JSON.stringify(preferences))
          change(saved);
      }
    } catch {
      /* Blocked cookies leave the current reading preferences usable. */
    }
  });
  useEffect(() => {
    reconcilePreferences();
    void refreshOffline();
    function historyChanged() {
      requestedNavigation.current = undefined;
    }
    function refreshed() {
      void refreshOffline();
    }
    function clicked(event: MouseEvent) {
      if (
        !offlineSnapshot().enabled ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      )
        return;
      const target =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (
        !(target instanceof HTMLAnchorElement) ||
        target.hasAttribute("data-offline-ignore") ||
        target.getAttribute("aria-disabled") === "true" ||
        target.getAttribute("role") === "button" ||
        target.hasAttribute("download") ||
        (target.target && target.target !== "_self")
      )
        return;
      const url = new URL(target.href);
      if (!pageAllowed(url, location.origin)) return;
      if (
        url.pathname === location.pathname &&
        url.search === location.search &&
        url.hash
      )
        return;
      requestedNavigation.current = { href: url.href, at: Date.now() };
      if (navigator.onLine) return;
      event.preventDefault();
      event.stopPropagation();
      location.assign(url.href);
    }
    function install(event: Event) {
      offerInstall(event as InstallPrompt);
    }
    function workerMessage(event: MessageEvent) {
      if (
        !offlineSnapshot().enabled ||
        event.source !== navigator.serviceWorker.controller ||
        event.data?.type !== "NAVIGATION_OFFLINE" ||
        typeof event.data.href !== "string"
      )
        return;
      const url = new URL(event.data.href, location.origin);
      if (!pageAllowed(url, location.origin)) return;
      const requested = requestedNavigation.current;
      const recent = requested && Date.now() - requested.at < 15_000;
      if (
        recent
          ? offlineNavigationKey(new URL(requested!.href)) !==
            offlineNavigationKey(url)
          : offlineNavigationKey(new URL(location.href)) !==
            offlineNavigationKey(url)
      )
        return;
      location.assign(recent ? requested!.href : url.href);
    }
    const channel = openOfflineChannel();
    if (channel) channel.onmessage = refreshed;
    window.addEventListener("focus", refreshed);
    window.addEventListener("popstate", historyChanged);
    window.addEventListener("lingualocal:offlinechange", refreshed);
    window.addEventListener("beforeinstallprompt", install);
    window.addEventListener("appinstalled", installedApp);
    navigator.serviceWorker?.addEventListener("controllerchange", refreshed);
    navigator.serviceWorker?.addEventListener("message", workerMessage);
    document.addEventListener("click", clicked, true);
    return () => {
      channel?.close();
      window.removeEventListener("focus", refreshed);
      window.removeEventListener("popstate", historyChanged);
      window.removeEventListener("lingualocal:offlinechange", refreshed);
      window.removeEventListener("beforeinstallprompt", install);
      window.removeEventListener("appinstalled", installedApp);
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        refreshed,
      );
      navigator.serviceWorker?.removeEventListener("message", workerMessage);
      document.removeEventListener("click", clicked, true);
    };
  }, []);
  useEffect(() => {
    const requested = requestedNavigation.current;
    if (
      requested &&
      offlineNavigationKey(new URL(requested.href)) !==
        offlineNavigationKey(new URL(location.href))
    )
      requestedNavigation.current = undefined;
  }, [pathname, query]);
  useEffect(() => {
    if (!state.ready || !state.enabled || state.busy) return;
    const timer = setTimeout(() => {
      void warmOffline(locale);
    }, 750);
    return () => clearTimeout(timer);
  }, [locale, pathname, query, state.ready, state.enabled, state.busy]);
  return null;
}
