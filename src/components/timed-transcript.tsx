"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "./locale-provider";
import { Pagination } from "./pagination";
import {
  parseSubtitles,
  plainSubtitle,
  type SubtitleCue,
} from "@/lib/subtitles";
import { transcriptSelection } from "@/lib/transcript-selection";
import { DOCUMENT_LIMIT } from "@/lib/document-limits";
import { useFocusOnChange } from "@/lib/use-focus-on-change";
import { mediaUrl } from "@/lib/media-url";

function clock(seconds: number) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
const pageSize = 20;
export function TimedTranscript({
  file,
  fallback,
  currentTime,
  seek,
}: {
  file?: string;
  fallback?: string;
  currentTime: number;
  seek: (time: number) => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [cues, setCues] = useState<SubtitleCue[] | null>(null);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState("");
  const text = useRef<HTMLDivElement>(null);
  const captionRef = useFocusOnChange(page);
  useEffect(() => {
    if (!open || !file || cues || error) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(mediaUrl(file!), {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Transcript unavailable");
        if (Number(response.headers.get("content-length")) > DOCUMENT_LIMIT)
          throw new Error("Transcript too large");
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Transcript unavailable");
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > DOCUMENT_LIMIT) throw new Error("Transcript too large");
            chunks.push(value);
          }
        } finally {
          await reader.cancel();
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        const input = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        const parsed = parseSubtitles(input);
        if (!controller.signal.aborted) setCues(parsed.cues);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [open, file, cues, error]);
  const captureSelection = useCallback(() => {
    const selected = window.getSelection();
    if (
      !selected ||
      selected.isCollapsed ||
      !text.current?.contains(selected.anchorNode) ||
      !text.current.contains(selected.focusNode)
    ) {
      setSelection("");
      return;
    }
    setSelection(transcriptSelection(selected.toString()));
  }, []);
  useEffect(() => {
    if (!open) return;
    const changed = () => {
      if (!window.getSelection()?.isCollapsed) captureSelection();
    };
    const clicked = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !text.current?.closest("details")?.contains(event.target)
      )
        setSelection("");
    };
    document.addEventListener("selectionchange", changed);
    document.addEventListener("pointerdown", clicked);
    return () => {
      document.removeEventListener("selectionchange", changed);
      document.removeEventListener("pointerdown", clicked);
    };
  }, [open, captureSelection]);
  const active =
    cues?.findIndex(
      (cue) => currentTime >= cue.start && currentTime < cue.end,
    ) ?? -1;
  return (
    <details
      className="transcript"
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
        if (!event.currentTarget.open) setSelection("");
      }}
    >
      <summary>{t("Read the transcript")}</summary>
      <div ref={text} onMouseUp={captureSelection} onKeyUp={captureSelection}>
        {file && !cues && !error && open && (
          <p role="status">{t("Loading transcript")}</p>
        )}
        {error && (
          <p className="inline-message" role="status">
            {t("Timed transcript is unavailable.")}
          </p>
        )}
        {(!file || error) && fallback && (
          <p lang="en" dir="ltr">
            {fallback}
          </p>
        )}
        {cues && (
          <>
            <p className="sr-only" tabIndex={-1} ref={captionRef}>
              {t("Page {current} of {total}", {
                current: page + 1,
                total: Math.ceil(cues.length / pageSize),
              })}
            </p>
            {active >= 0 && Math.floor(active / pageSize) !== page && (
              <button
                className="button secondary"
                onClick={() => setPage(Math.floor(active / pageSize))}
              >
                {t("Current passage")}
              </button>
            )}
            <ol className="transcript-cues" start={page * pageSize + 1}>
              {cues
                .slice(page * pageSize, (page + 1) * pageSize)
                .map((cue, index) => (
                  <li
                    key={`${cue.start}-${page * pageSize + index}`}
                    className={
                      active === page * pageSize + index ? "current" : ""
                    }
                  >
                    <button
                      className="transcript-time"
                      aria-label={t("Play from {time}", {
                        time: clock(cue.start),
                      })}
                      aria-current={
                        active === page * pageSize + index ? "true" : undefined
                      }
                      onClick={() => seek(cue.start)}
                    >
                      <span dir="ltr">{clock(cue.start)}</span>
                    </button>
                    <p lang="en" dir="ltr">
                      {plainSubtitle(cue.text)}
                    </p>
                  </li>
                ))}
            </ol>
            <Pagination
              page={page}
              pages={Math.ceil(cues.length / pageSize)}
              onChange={setPage}
            />
          </>
        )}
      </div>
      <div aria-live="polite">
        {selection && (
          <Link
            className="text-link transcript-lookup"
            href={`/dictionary?search=${encodeURIComponent(selection)}`}
          >
            {t("Look up {word}", { word: selection })}
          </Link>
        )}
      </div>
    </details>
  );
}
