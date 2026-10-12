"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Download, Mic, Square, Trash2 } from "lucide-react";
import { useLocale } from "./locale-provider";
import { numberingSystem } from "@/lib/locale";
import { downloadBlob } from "@/lib/download";
import {
  recordingFilename,
  recordingTime,
  type Recording,
} from "@/lib/recording";
import {
  listRecordings,
  removeRecording,
  removeUnreadableRecordings,
  subscribeRecordings,
} from "@/lib/recordings";
import {
  clearVoiceFeedback,
  discardVoiceTake,
  emptyVoiceSession,
  saveVoiceTake,
  voiceCaptureFailed,
  subscribeVoiceSession,
  voiceSession,
} from "@/lib/voice-session";
import { idleCapture, VoiceCapture } from "@/lib/voice-capture";
import type { Book } from "@/lib/schema";

function AudioTake({ recording }: { recording: Recording }) {
  const { t } = useLocale();
  const player = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const audio = player.current;
    if (!audio) return;
    const objectUrl = URL.createObjectURL(recording.blob);
    audio.src = objectUrl;
    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(objectUrl);
    };
  }, [recording.blob]);
  return (
    <audio
      ref={player}
      controls
      preload="metadata"
      aria-label={`${t("Play recording")} ${recording.title}`}
    />
  );
}

export function VoiceRecorder({ book, open }: { book: Book; open: boolean }) {
  const { locale, t } = useLocale();
  const [records, setRecords] = useState<Recording[]>([]);
  const [unreadable, setUnreadable] = useState(0);
  const [capture, setCapture] = useState(idleCapture);
  const [deleting, setDeleting] = useState(false);
  const session = useSyncExternalStore(
    subscribeVoiceSession,
    voiceSession,
    () => emptyVoiceSession,
  );
  const { draft } = session;
  const busy = session.busy || deleting;
  const [error, setError] = useState("");
  const [readError, setReadError] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef(false);
  const busyRef = useRef(false);
  const refreshSequence = useRef(0);
  const recorder = useRef<VoiceCapture | null>(null);
  const recordButton = useRef<HTMLButtonElement>(null);
  const container = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    try {
      const result = await listRecordings();
      if (!active.current || sequence !== refreshSequence.current) return;
      setRecords((previous) => {
        const retained = new Map(previous.map((take) => [take.id, take]));
        return result.records.map((take) => retained.get(take.id) ?? take);
      });
      setUnreadable(result.unreadable);
      setReadError(false);
    } catch {
      if (active.current && sequence === refreshSequence.current)
        setReadError(true);
    }
  }, []);

  useEffect(() => {
    active.current = true;
    const controller = new VoiceCapture(
      setCapture,
      (take) => void saveVoiceTake(take),
      voiceCaptureFailed,
    );
    recorder.current = controller;
    // IndexedDB reads complete asynchronously and refresh external browser data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const unsubscribe = subscribeRecordings(() => void refresh());
    const stopWhenHidden = () => {
      if (document.hidden) controller.stop();
    };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      active.current = false;
      controller.dispose();
      recorder.current = null;
      unsubscribe();
      document.removeEventListener("visibilitychange", stopWhenHidden);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) {
      recorder.current?.stop();
      container.current
        ?.querySelectorAll("audio")
        .forEach((audio) => audio.pause());
    }
  }, [open]);

  async function remove(take?: Recording) {
    if (busyRef.current || voiceSession().busy || capture.phase !== "idle")
      return;
    if (
      !window.confirm(
        t(take ? "Delete this take?" : "Remove unreadable takes?"),
      )
    )
      return;
    busyRef.current = true;
    setDeleting(true);
    setError("");
    setMessage("");
    try {
      if (take) await removeRecording(take.id);
      else await removeUnreadableRecordings();
      if (active.current) {
        setMessage("Take removed");
        clearVoiceFeedback();
        await refresh();
        recordButton.current?.focus();
      }
    } catch {
      if (active.current) setError("Unable to remove this take. Try again.");
    } finally {
      busyRef.current = false;
      if (active.current) setDeleting(false);
    }
  }

  function download(take: Recording) {
    setError("");
    try {
      downloadBlob(take.blob, recordingFilename(take));
    } catch {
      setError("Unable to download this take. Try again.");
    }
  }

  const label =
    capture.phase === "requesting"
      ? "Cancel"
      : capture.phase === "recording"
        ? "Stop and save"
        : capture.phase === "finishing" || session.busy
          ? "Saving…"
          : "Record a take";
  const recording = capture.phase === "recording";
  const disabled = busy || capture.phase === "finishing" || Boolean(draft);
  const dateFormat = new Intl.DateTimeFormat(locale, {
    calendar: "gregory",
    numberingSystem: numberingSystem(locale),
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="voice-recorder" ref={container}>
      <p className="muted">
        {t("Record up to a minute. Stop to save a take on this device.")}
      </p>
      <div className="voice-actions">
        <button
          className={`button ${recording ? "secondary" : "primary"}`}
          ref={recordButton}
          aria-disabled={disabled}
          onClick={() => {
            if (
              busyRef.current ||
              voiceSession().draft ||
              voiceSession().busy ||
              capture.phase === "finishing"
            )
              return;
            setError("");
            setMessage("");
            clearVoiceFeedback();
            if (capture.phase === "requesting" || capture.phase === "recording")
              recorder.current?.stop();
            else void recorder.current?.start(book);
          }}
        >
          {recording ? (
            <Square size={14} aria-hidden="true" />
          ) : (
            <Mic size={16} aria-hidden="true" />
          )}
          {t(label)}
        </button>
        {recording && (
          <bdi dir="ltr" className="recording-time">
            {recordingTime(capture.seconds)}
          </bdi>
        )}
      </div>
      <p className="sr-only" role="status">
        {capture.phase === "requesting"
          ? t("Waiting for microphone access")
          : recording
            ? t("Recording")
            : message || session.message
              ? t(message || session.message)
              : ""}
      </p>
      {(error || capture.error || session.error) && (
        <p className="inline-message" role="alert">
          {t(error || capture.error || session.error)}
        </p>
      )}
      {readError && (
        <div className="inline-message" role="alert">
          <p>{t("Unable to read saved takes. Try again.")}</p>
          <button className="button secondary" onClick={() => void refresh()}>
            {t("Try again")}
          </button>
        </div>
      )}
      {draft && (
        <div className="unsaved-take">
          <h3>{t("Unsaved take")}</h3>
          <strong lang="en" dir="ltr">
            {draft.title}
          </strong>
          <p className="muted">
            {t("Download this take before closing or reloading the page.")}
          </p>
          <AudioTake recording={draft} />
          <div className="button-row">
            <button
              className="button secondary"
              aria-disabled={busy}
              onClick={async () => {
                if (busyRef.current || voiceSession().busy) return;
                setError("");
                setMessage("");
                if (await saveVoiceTake(draft)) {
                  if (active.current) recordButton.current?.focus();
                }
              }}
            >
              {t(session.busy ? "Saving…" : "Try again")}
            </button>
            <button
              className="button secondary"
              onClick={() => download(draft)}
            >
              <Download size={14} aria-hidden="true" />
              {t("Download take")}
            </button>
            <button
              className="button secondary"
              aria-disabled={busy}
              onClick={() => {
                if (
                  busyRef.current ||
                  voiceSession().busy ||
                  !window.confirm(t("Delete this take?"))
                )
                  return;
                discardVoiceTake();
                setError("");
                recordButton.current?.focus();
              }}
            >
              {t("Discard")}
            </button>
          </div>
        </div>
      )}
      {unreadable > 0 && (
        <div className="inline-message">
          <p>{t("Some saved takes cannot be read.")}</p>
          <button
            className="button secondary"
            aria-disabled={busy || capture.phase !== "idle"}
            onClick={() => void remove()}
          >
            {t("Remove unreadable takes")}
          </button>
        </div>
      )}
      {records.length > 0 && (
        <ul className="recording-list">
          {records.map((take) => {
            const date = dateFormat.format(take.createdAt);
            return (
              <li key={take.id}>
                <div className="recording-heading">
                  <strong lang="en" dir="ltr">
                    {take.title}
                  </strong>
                  <time
                    className="muted"
                    dateTime={new Date(take.createdAt).toISOString()}
                  >
                    {date}
                  </time>
                  <bdi dir="ltr" className="recording-duration muted">
                    {recordingTime(take.seconds)}
                  </bdi>
                </div>
                <AudioTake recording={take} />
                <div className="button-row">
                  <button
                    className="button secondary"
                    aria-label={`${t("Download take")} ${take.title} ${date}`}
                    onClick={() => download(take)}
                  >
                    <Download size={14} aria-hidden="true" />
                    {t("Download take")}
                  </button>
                  <button
                    className="button secondary"
                    aria-disabled={busy || capture.phase !== "idle"}
                    aria-label={`${t("Delete take")} ${take.title} ${date}`}
                    onClick={() => void remove(take)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    {t("Delete take")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
