"use client";
import { CloudDownload, ChevronDown } from "lucide-react";
import { useLocale } from "./locale-provider";
import { useOffline } from "@/lib/use-offline";
import {
  enableOffline,
  removeOffline,
  retryOffline,
  installApp,
} from "@/lib/offline-client";
export function OfflineSettings() {
  const { t, locale } = useLocale();
  const state = useOffline();
  return (
    <section className="panel offline-panel no-print">
      <details className="offline-settings">
        <summary>
          <CloudDownload size={17} aria-hidden="true" />
          {t("Offline use")}
          <ChevronDown
            className="disclosure-chevron"
            size={16}
            aria-hidden="true"
          />
        </summary>
        {!state.ready ? (
          <p className="muted">{t("Loading…")}</p>
        ) : state.capability !== "supported" ? (
          <p className="muted">
            {t(
              state.capability === "insecure"
                ? "Offline pages require HTTPS or localhost."
                : "Offline pages are unavailable in this browser.",
            )}
          </p>
        ) : (
          <>
            <p className="muted">
              {t(
                state.enabled
                  ? "Visited pages are saved on this device."
                  : "When enabled, visited pages are saved on this device.",
              )}
            </p>
            <div className="button-row">
              {!state.enabled ? (
                <button
                  className="button primary"
                  disabled={state.busy}
                  onClick={() => void enableOffline(locale)}
                >
                  {t(state.busy ? "Saving pages…" : "Enable offline pages")}
                </button>
              ) : (
                <button
                  className="button secondary"
                  disabled={state.busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        t(
                          "Remove saved pages and offline media from this device?",
                        ),
                      )
                    )
                      void removeOffline();
                  }}
                >
                  {t("Remove offline copies")}
                </button>
              )}
              {state.enabled && state.installReady && (
                <button
                  className="button primary"
                  disabled={state.busy}
                  onClick={() => void installApp()}
                >
                  {t("Install app")}
                </button>
              )}
              {(state.enabled ||
                state.errorAction === "remove" ||
                state.errorAction === "refresh") &&
                state.error &&
                state.errorAction !== "install" && (
                  <button
                    className="button secondary"
                    disabled={state.busy}
                    onClick={() => void retryOffline(locale)}
                  >
                    {t("Try again")}
                  </button>
                )}
            </div>
            <p className="offline-status muted" role="status">
              {state.enabled
                ? t("{count} saved pages", { count: state.pages })
                : ""}
            </p>
            {state.error && (
              <p className="inline-message" role="alert">
                {t(state.error)}
              </p>
            )}
          </>
        )}
      </details>
    </section>
  );
}
