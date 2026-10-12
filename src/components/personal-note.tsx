"use client";

import { useId, useRef, useState } from "react";
import { PenLine } from "lucide-react";
import { noteKey } from "@/lib/personal-study";
import { useProgress } from "./progress-provider";
import { useLocale } from "./locale-provider";

export function PersonalNote({
  kind,
  id,
  title,
  compact = false,
}: {
  kind: "word" | "lesson";
  id: string;
  title: string;
  compact?: boolean;
}) {
  const { t, locale, dir } = useLocale();
  const { progress, setNote, persistent } = useProgress();
  const key = noteKey(kind, id);
  const saved = progress.notes[key] ?? "";
  const [draft, setDraft] = useState<{ base: string; text: string } | null>(
    null,
  );
  const [notice, setNotice] = useState<{ text: string; value: string } | null>(
    null,
  );
  const [previousSaved, setPreviousSaved] = useState(saved);
  if (previousSaved !== saved) {
    setPreviousSaved(saved);
    if (notice && notice.value !== saved) setNotice(null);
  }
  const message = notice?.value === saved ? notice.text : "";
  const field = useId();
  const details = useRef<HTMLDetailsElement>(null);
  const conflict = draft !== null && draft.base !== saved;
  const summary = t(saved ? "Edit note for {title}" : "Add note for {title}", {
    title,
  });
  function close() {
    if (!details.current) return;
    details.current.open = false;
    setNotice(null);
    details.current.querySelector("summary")?.focus({ preventScroll: true });
  }
  return (
    <details
      className={`personal-note no-print ${compact ? "personal-note-compact" : ""}`}
      ref={details}
      lang={locale}
      dir={compact ? "ltr" : dir}
      onToggle={(event) => {
        if (event.currentTarget.open)
          event.currentTarget
            .querySelector("textarea")
            ?.focus({ preventScroll: true });
        else setNotice(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          close();
        }
      }}
    >
      <summary
        className={compact ? "icon-button" : "text-link"}
        title={summary}
        aria-label={t("My note for {title}", { title })}
        aria-describedby={saved ? `${field}-state` : undefined}
      >
        <PenLine size={16} aria-hidden="true" />
        <span className={compact ? "sr-only" : undefined}>{t("My note")}</span>
        {saved && <span className="note-dot" aria-hidden="true" />}
        <span id={`${field}-state`} className="sr-only">
          {saved ? t("Note saved.") : ""}
        </span>
      </summary>
      <form
        className="personal-note-body"
        dir={dir}
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft?.text ?? saved;
          if (!setNote(key, text)) {
            setNotice({ text: "Note limit reached.", value: saved });
            return;
          }
          setDraft(null);
          setNotice({ text: "Note saved.", value: text.trim() });
        }}
      >
        <div className="form-field">
          <label htmlFor={field} className={compact ? undefined : "sr-only"}>
            {t("My note")}
          </label>
          <textarea
            id={field}
            aria-label={t("My note for {title}", { title })}
            dir="auto"
            rows={3}
            maxLength={1500}
            value={draft?.text ?? saved}
            onChange={(event) => {
              setDraft((previous) => ({
                base: previous?.base ?? saved,
                text: event.target.value,
              }));
              setNotice(null);
            }}
          />
        </div>
        <div className="button-row">
          <button
            type="submit"
            className="button primary"
            disabled={(draft?.text ?? saved).trim() === saved}
          >
            {t(conflict ? "Overwrite note" : "Save note")}
          </button>
          {conflict && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setDraft(null);
                setNotice(null);
              }}
            >
              {t("Reload note")}
            </button>
          )}
          <button type="button" className="text-link" onClick={close}>
            {t("Close note")}
          </button>
        </div>
        <p
          className={
            conflict || (message && message !== "Note saved.")
              ? "inline-message"
              : message
                ? "personal-note-status"
                : "sr-only"
          }
          role="status"
        >
          {t(
            conflict
              ? "This note changed in another tab."
              : message === "Note saved." && !persistent
                ? "Note saved for this visit."
                : message,
          )}
        </p>
      </form>
    </details>
  );
}
