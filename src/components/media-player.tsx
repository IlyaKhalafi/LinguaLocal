"use client";
import { useEffect, useRef, useState } from "react";
import { Repeat2, RotateCcw } from "lucide-react";
import type { Resource } from "@/lib/schema";

export function mediaUrl(file: string) {
  return `/api/media/${file.split("/").map(encodeURIComponent).join("/")}`;
}
export function MediaPlayer({
  resource,
  onClose,
}: {
  resource: Resource;
  onClose: () => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState("");
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [loop, setLoop] = useState(false);
  const [captions, setCaptions] = useState(false);
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    section.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "nearest",
    });
    section.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const tracks = video.current?.textTracks;
    if (!tracks) return;
    const sync = () => setCaptions(tracks[0]?.mode === "showing");
    tracks.addEventListener("change", sync);
    return () => tracks.removeEventListener("change", sync);
  }, []);
  const media = () =>
    resource.kind === "video" ? video.current : audio.current;
  function changeSpeed(value: number) {
    setSpeed(value);
    const player = media();
    if (player) player.playbackRate = value;
  }
  function updateTime() {
    const player = media();
    if (
      loop &&
      start !== null &&
      end !== null &&
      player &&
      player.currentTime >= end
    )
      player.currentTime = start;
  }
  function markEnd() {
    const current = media()?.currentTime;
    if (current === undefined || start === null) return;
    if (current <= start + 0.25) {
      setError(
        "Let the recording play a little further before setting the end of your loop.",
      );
      return;
    }
    setEnd(current);
    setLoop(true);
    setError("");
  }
  const properties = {
    controls: true,
    preload: "metadata",
    src: mediaUrl(resource.file),
    onTimeUpdate: updateTime,
    onLoadedMetadata: () => {
      changeSpeed(speed);
      setCaptions(video.current?.textTracks[0]?.mode === "showing");
    },
    onRateChange: () => {
      const player = media();
      if (player) setSpeed(player.playbackRate);
    },
    onPlaying: () => setError(""),
    onEnded: () => {
      const player = media();
      if (loop && start !== null && player) {
        player.currentTime = start;
        void player
          .play()
          .catch(() => setError("Press play to continue your loop."));
      }
    },
    onError: () =>
      setError(
        "This file could not be played. Ask your school to check the media file and format.",
      ),
    "aria-label": resource.title,
  } as const;
  return (
    <section
      className="media-player"
      aria-label="Media player"
      ref={section}
      tabIndex={-1}
    >
      <div className="section-heading">
        <h3>{resource.title}</h3>
        <button
          className="text-link"
          style={{ border: 0, background: "none" }}
          onClick={onClose}
        >
          Close player
        </button>
      </div>
      {resource.kind === "video" ? (
        <video {...properties} ref={video} playsInline>
          {resource.captions && (
            <track
              kind="captions"
              src={mediaUrl(resource.captions)}
              srcLang="en"
              label="English"
              onError={() =>
                setError(
                  "Captions could not be loaded. Ask your school to check the caption file.",
                )
              }
            />
          )}
        </video>
      ) : (
        <audio {...properties} ref={audio} />
      )}
      <div className="listening-controls">
        {resource.kind === "video" && resource.captions && (
          <button
            className={`button ${captions ? "primary" : "secondary"}`}
            aria-pressed={captions}
            onClick={() => {
              const player = media();
              const track =
                player instanceof HTMLVideoElement
                  ? player.textTracks[0]
                  : undefined;
              if (track) track.mode = captions ? "disabled" : "showing";
            }}
          >
            {captions ? "Hide captions" : "Show captions"}
          </button>
        )}
        <label htmlFor="playback-speed">Playback speed</label>
        <select
          id="playback-speed"
          value={speed}
          onChange={(e) => changeSpeed(Number(e.target.value))}
        >
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((value) => (
            <option key={value} value={value}>
              {value}×
            </option>
          ))}
        </select>
        <button
          className="button secondary"
          onClick={() => {
            const player = media();
            if (player)
              player.currentTime = Math.max(0, player.currentTime - 10);
          }}
        >
          <RotateCcw size={12} />
          Back 10 seconds
        </button>
        <button
          className="button secondary"
          onClick={() => {
            setStart(media()?.currentTime ?? 0);
            setEnd(null);
            setLoop(false);
          }}
        >
          Set loop start{start !== null && ` ${start.toFixed(1)}s`}
        </button>
        <button
          className="button secondary"
          disabled={start === null}
          onClick={markEnd}
        >
          Set loop end{end !== null && ` ${end.toFixed(1)}s`}
        </button>
        {end !== null && (
          <button
            className={`button ${loop ? "primary" : "secondary"}`}
            aria-pressed={loop}
            onClick={() => setLoop(!loop)}
          >
            <Repeat2 size={12} />
            {loop ? "Repeat on" : "Repeat off"}
          </button>
        )}
      </div>
      {error && (
        <p className="inline-message" role="alert">
          {error}
        </p>
      )}
      {resource.transcript && (
        <details>
          <summary>Read the transcript</summary>
          <p>{resource.transcript}</p>
        </details>
      )}
    </section>
  );
}
