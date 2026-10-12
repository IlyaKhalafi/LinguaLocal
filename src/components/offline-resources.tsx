"use client";
import { useRef, useState } from "react";
import { ChevronDown, CloudDownload } from "lucide-react";
import { useLocale } from "./locale-provider";
import { useOffline } from "@/lib/use-offline";
import { changeOfflineMedia, offlineSnapshot } from "@/lib/offline-client";
import { mediaUrl } from "@/lib/media-url";
import type { Resource } from "@/lib/schema";

export function OfflineResources({ resources }: { resources: Resource[] }) {
  const { t } = useLocale();
  const state = useOffline();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [pending, setPending] = useState<{ id: string; save: boolean } | null>(
    null,
  );
  const saveButtons = useRef(new Map<string, HTMLButtonElement>());
  if (!state.enabled || !resources.length) return null;
  async function change(resource: Resource, save: boolean) {
    if (offlineSnapshot().busy) return;
    setFeedbackTitle(resource.title);
    setMessage("");
    setError("");
    setPending({ id: resource.id, save });
    try {
      await changeOfflineMedia(
        mediaUrl(resource.file),
        save,
        resource.captions ? mediaUrl(resource.captions) : undefined,
      );
      setMessage(save ? "Saved offline" : "Offline copy removed");
      if (!save) saveButtons.current.get(resource.id)?.focus();
    } catch (failure) {
      const reason = failure instanceof Error ? failure.message : "unavailable";
      setError(
        reason === "too-large"
          ? "This file is too large for offline storage. Use Download instead."
          : reason === "media-full"
            ? "Offline storage is full. Remove a saved file and try again."
            : reason === "partial-save"
              ? "Some files could not be saved. Remove this copy and try again."
              : "Unable to update this offline copy. Reconnect and try again.",
      );
    } finally {
      setPending(null);
    }
  }
  return (
    <details className="panel offline-resources no-print">
      <summary>
        <CloudDownload size={17} aria-hidden="true" />
        {t("Offline copies")}
        <ChevronDown
          className="disclosure-chevron"
          size={16}
          aria-hidden="true"
        />
      </summary>
      <p className="muted">
        {t(
          "Choose files to keep on this device. Refresh a copy when your school changes the file.",
        )}
      </p>
      <ul className="offline-resource-list">
        {resources.map((resource) => {
          const files = [
            mediaUrl(resource.file),
            ...(resource.captions ? [mediaUrl(resource.captions)] : []),
          ];
          const saved = files.every((file) =>
            state.media.some(
              (entry) => entry.url === new URL(file, location.origin).href,
            ),
          );
          const partial = state.media.some(
            (entry) => entry.url === new URL(files[0], location.origin).href,
          );
          return (
            <li key={resource.id}>
              <div className="offline-resource-title">
                <strong lang="en" dir="ltr">
                  {resource.title}
                </strong>
                {saved && <span className="muted">{t("Saved offline")}</span>}
              </div>
              <div className="button-row">
                <button
                  className="button secondary"
                  aria-disabled={state.busy}
                  ref={(button) => {
                    if (button) saveButtons.current.set(resource.id, button);
                    else saveButtons.current.delete(resource.id);
                  }}
                  aria-label={`${t(pending?.id === resource.id && pending.save ? "Saving…" : saved ? "Refresh copy" : "Save offline")} ${resource.title}`}
                  onClick={() => void change(resource, true)}
                >
                  {t(
                    pending?.id === resource.id && pending.save
                      ? "Saving…"
                      : saved
                        ? "Refresh copy"
                        : "Save offline",
                  )}
                </button>
                {partial && (
                  <button
                    className="button secondary"
                    aria-disabled={state.busy}
                    aria-label={`${t(pending?.id === resource.id && !pending.save ? "Removing…" : "Remove copy")} ${resource.title}`}
                    onClick={() => void change(resource, false)}
                  >
                    {t(
                      pending?.id === resource.id && !pending.save
                        ? "Removing…"
                        : "Remove copy",
                    )}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="sr-only" role="status">
        {(pending || message) && (
          <>
            {t(pending ? (pending.save ? "Saving…" : "Removing…") : message)}{" "}
            <bdi lang="en" dir="ltr">
              {feedbackTitle}
            </bdi>
          </>
        )}
      </p>
      {error && (
        <p className="inline-message" role="alert">
          <bdi lang="en" dir="ltr">
            {feedbackTitle}
          </bdi>{" "}
          {t(error)}
        </p>
      )}
    </details>
  );
}
