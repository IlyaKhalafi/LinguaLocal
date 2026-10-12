import { parseRange } from "./byte-range";
export const OFFLINE_PREFIX = "lingualocal-offline";
export const OFFLINE_CONFIG = `${OFFLINE_PREFIX}-settings`;
export const MAX_CACHED_PAGES = 30;
export const MAX_PAGE_BYTES = 3 * 1024 * 1024;
export const MAX_ASSET_BYTES = 12 * 1024 * 1024;
export const MAX_ASSET_TOTAL = 64 * 1024 * 1024;
export const MAX_ASSET_FILES = 160;
export const MAX_MEDIA_BYTES = 64 * 1024 * 1024;
export const MAX_MEDIA_TOTAL = 256 * 1024 * 1024;
export const MAX_MEDIA_FILES = 12;
export function pageAllowed(url: URL, origin: string) {
  return (
    url.origin === origin &&
    url.href.length <= 10_000 &&
    !url.searchParams.has("_rsc") &&
    /^\/(?:|dictionary|flashcards|progress|settings|assignment|library(?:\/[a-z0-9][a-z0-9-]{0,79})?|lessons(?:\/[a-z0-9][a-z0-9-]{0,79})?|games(?:\/(?:quiz|match|practice))?)$/.test(
      url.pathname,
    )
  );
}
export function assetAllowed(url: URL, origin: string) {
  return (
    url.origin === origin &&
    ((url.pathname.startsWith("/_next/static/") &&
      /\.(?:js|css|woff2?|ttf)$/.test(url.pathname)) ||
      /^\/(?:icon\.svg|icons\/app-(?:192|512)\.png)$/.test(url.pathname))
  );
}
export function offlineLocale(value: unknown): "en" | "fa" | "ar" | "tr" {
  return value === "fa" || value === "ar" || value === "tr" ? value : "en";
}
export function documentLocale(html: string) {
  return offlineLocale(
    html.match(/<html\b[^>]*\blang=["'](en|fa|ar|tr)["']/i)?.[1],
  );
}
export function offlinePageKey(url: URL, locale: string) {
  const key = new URL(url);
  key.hash = "";
  key.searchParams.set("__ll_locale", offlineLocale(locale));
  return key.href;
}
export function offlineNavigationKey(url: URL) {
  const query = new URLSearchParams(url.search);
  query.sort();
  return url.origin + url.pathname + (query.size ? "?" + query.toString() : "");
}
export function mediaAllowed(url: URL, origin: string) {
  return (
    url.origin === origin &&
    url.pathname.startsWith("/api/media/") &&
    url.href.length <= 2048 &&
    !url.search &&
    !url.hash
  );
}
export function byteRange(value: string, size: number) {
  const range = parseRange(value, size);
  return range && range !== "invalid" ? range : undefined;
}
