"use client";
import { useSyncExternalStore } from "react";
import {
  direction,
  LOCALE_COOKIE,
  parseLocale,
  translate,
  type Locale,
} from "@/lib/locale";
const subscribe = () => () => {};
const snapshot = () =>
  parseLocale(
    document.cookie
      .split("; ")
      .find((item) => item.startsWith(`${LOCALE_COOKIE}=`))
      ?.split("=")[1],
  );
const serverSnapshot = (): Locale => "en";
export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const locale = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const t = (text: string) => translate(locale, text);
  return (
    <html lang={locale} dir={direction(locale)}>
      <body
        style={{
          fontFamily: "Arial, sans-serif",
          padding: 40,
          background: "#f8f9f7",
          color: "#243f36",
        }}
      >
        <h1>{t("Unable to load this page")}</h1>
        <p>{t("Ask the school to check the server files.")}</p>
        <button
          onClick={reset}
          style={{ padding: "12px 20px", cursor: "pointer" }}
        >
          {t("Try again")}
        </button>
      </body>
    </html>
  );
}
