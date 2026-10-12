"use client";
import { useId, useState, useRef } from "react";
import { Download, ChevronDown } from "lucide-react";
import { useLocale } from "./locale-provider";
import { useProgress } from "./progress-provider";
import { useClientReady } from "@/lib/use-client-ready";
import { dayKey } from "@/lib/learning";
import {
  createStudyReport,
  studyReportHtml,
  studyReportNameSchema,
  STUDY_NAME_LIMIT,
} from "@/lib/study-report";
import { downloadBlob, downloadJson } from "@/lib/download";
import type { ContentPack } from "@/lib/schema";

export function StudySummary({ content }: { content: ContentPack }) {
  const ready = useClientReady();
  const { progress } = useProgress();
  const { locale, t } = useLocale();
  const id = useId();
  const nameInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [invalidName, setInvalidName] = useState(false);

  function download(print: boolean) {
    setStatus("");
    const trimmed = name.trim();
    const parsedName = trimmed
      ? studyReportNameSchema.safeParse(trimmed)
      : undefined;
    if (parsedName && !parsedName.success) {
      setInvalidName(true);
      setError("Use a name with letters or numbers, up to 64 characters.");
      nameInput.current?.focus();
      return;
    }
    try {
      const report = createStudyReport(progress, content, parsedName?.data);
      const filename = `lingualocal-summary-${dayKey(new Date(report.generatedAt))}`;
      if (print)
        downloadBlob(
          new Blob([studyReportHtml(report, locale)], {
            type: "text/html;charset=utf-8",
          }),
          `${filename}.html`,
        );
      else downloadJson(report, `${filename}.json`);
      setError("");
      setStatus(
        print
          ? "Print file prepared. Open it to print."
          : "Summary file prepared.",
      );
      setInvalidName(false);
    } catch {
      setError("Unable to download the summary. Try again.");
    }
  }

  return (
    <details className="share-summary no-print">
      <summary>
        <Download size={16} aria-hidden="true" />
        {t("Share summary")}
        <ChevronDown
          className="disclosure-chevron"
          size={16}
          aria-hidden="true"
        />
      </summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          download(false);
        }}
      >
        <div className="form-field">
          <label htmlFor={id}>{t("Name (optional)")}</label>
          <input
            disabled={!ready}
            id={id}
            ref={nameInput}
            maxLength={STUDY_NAME_LIMIT}
            value={name}
            dir="auto"
            autoComplete="off"
            aria-invalid={invalidName || undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => {
              setName(event.target.value);
              setStatus("");
              setError("");
              setInvalidName(false);
            }}
          />
        </div>
        <p className="muted summary-privacy">
          {t(
            "The summary includes study totals and assignment details. Notes and word lists stay private.",
          )}
        </p>
        <div className="summary-actions">
          <button type="submit" className="button primary" disabled={!ready}>
            {t("Download summary")}
          </button>
          <button
            type="button"
            disabled={!ready}
            className="button secondary"
            onClick={() => download(true)}
          >
            {t("Download print sheet")}
          </button>
        </div>
        <p
          className={status ? "summary-privacy muted" : "sr-only"}
          role="status"
        >
          {t(status)}
        </p>
        {error && (
          <p className="inline-message" role="alert" id={`${id}-error`}>
            {t(error)}
          </p>
        )}
      </form>
    </details>
  );
}
