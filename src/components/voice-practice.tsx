"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Mic } from "lucide-react";
import { useLocale } from "./locale-provider";
import type { Book } from "@/lib/schema";

export function VoicePractice({ book }: { book: Book }) {
  const { t } = useLocale();
  const [opened, setOpened] = useState(false);
  const [Recorder, setRecorder] = useState<
    typeof import("./voice-recorder").VoiceRecorder | null
  >(null);
  const [error, setError] = useState(false);
  const loading = useRef(false);
  const mounted = useRef(false);
  const summary = useRef<HTMLElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function load() {
    if (loading.current || Recorder) return;
    loading.current = true;
    setError(false);
    try {
      const loaded = await import("./voice-recorder");
      if (mounted.current) setRecorder(() => loaded.VoiceRecorder);
    } catch {
      if (mounted.current) setError(true);
    } finally {
      loading.current = false;
    }
  }
  return (
    <details
      className="panel voice-practice no-print"
      onToggle={(event) => {
        const open = event.currentTarget.open;
        setOpened(open);
        if (open) void load();
      }}
    >
      <summary ref={summary}>
        <Mic size={17} aria-hidden="true" />
        {t("Voice practice")}
        <ChevronDown
          className="disclosure-chevron"
          size={16}
          aria-hidden="true"
        />
      </summary>
      {Recorder ? (
        <Recorder book={book} open={opened} />
      ) : (
        opened &&
        (error ? (
          <div className="inline-message" role="alert">
            <p>
              {t("Unable to load voice practice. Reconnect and try again.")}
            </p>
            <button
              className="button secondary"
              onClick={() => {
                summary.current?.focus();
                void load();
              }}
            >
              {t("Try again")}
            </button>
          </div>
        ) : (
          <p className="muted" role="status">
            {t("Loading…")}
          </p>
        ))
      )}
    </details>
  );
}
