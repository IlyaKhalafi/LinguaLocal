import { recordingLimits, type Recording } from "./recording";
import type { Book } from "./schema";
import { protectVoiceTake } from "./voice-unload";

export type CaptureState = {
  phase: "idle" | "requesting" | "recording" | "finishing";
  seconds: number;
  error: string;
};

export const idleCapture: CaptureState = {
  phase: "idle",
  seconds: 0,
  error: "",
};

export class VoiceCapture {
  private static current?: VoiceCapture;
  private generation = 0;
  private disposed = false;
  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private interval?: ReturnType<typeof setInterval>;
  private deadline?: ReturnType<typeof setTimeout>;
  private phase: CaptureState["phase"] = "idle";
  private startedAt = 0;
  private startedClock = 0;
  private stoppedSeconds = 0;
  private finishingAfterDispose = false;
  private completionTimeout?: ReturnType<typeof setTimeout>;
  private captureError = "";

  constructor(
    private update: (state: CaptureState) => void,
    private completed: (recording: Recording) => void,
    private failed: (error: string) => void = () => {},
  ) {}

  private seconds() {
    return Math.min(
      recordingLimits.seconds,
      Math.max(0.01, (performance.now() - this.startedClock) / 1000),
    );
  }

  private emit(phase: CaptureState["phase"], error = "") {
    this.phase = phase;
    protectVoiceTake(this, phase === "recording" || phase === "finishing");
    if (!this.disposed)
      this.update({
        phase,
        seconds: phase === "idle" ? 0 : this.seconds(),
        error,
      });
  }

  private release() {
    clearInterval(this.interval);
    clearTimeout(this.deadline);
    this.interval = undefined;
    this.deadline = undefined;
    this.stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    this.stream = undefined;
  }

  async start(book: Pick<Book, "id" | "title">) {
    if (this.disposed || this.phase !== "idle") return;
    if (VoiceCapture.current && VoiceCapture.current !== this) {
      this.emit("idle", "Another take is still finishing. Try again.");
      return;
    }
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      this.emit(
        "idle",
        "Voice recording needs HTTPS or localhost and a supported browser.",
      );
      return;
    }
    const generation = ++this.generation;
    VoiceCapture.current = this;
    this.startedAt = Date.now();
    this.startedClock = performance.now();
    this.stoppedSeconds = 0;
    this.captureError = "";
    this.emit("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (this.disposed || generation !== this.generation) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/mp4;codecs=mp4a.40.2",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error("unsupported-recorder");
      const recorder = new MediaRecorder(stream, { mimeType });
      this.recorder = recorder;
      const chunks: Blob[] = [];
      let bytes = 0;
      let error = "";
      recorder.ondataavailable = (event) => {
        if (
          (this.disposed && !this.finishingAfterDispose) ||
          generation !== this.generation ||
          error
        )
          return;
        bytes += event.data.size;
        if (bytes > recordingLimits.fileBytes) {
          error = "This take is too large. Try a shorter recording.";
          this.stop();
        } else if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => {
        error = "Unable to record audio. Check your microphone and try again.";
        this.stop();
      };
      recorder.onstop = () => {
        if (this.recorder !== recorder) return;
        const seconds = this.stoppedSeconds || this.seconds();
        this.release();
        clearTimeout(this.completionTimeout);
        this.recorder = undefined;
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        if (VoiceCapture.current === this) VoiceCapture.current = undefined;
        if (
          (this.disposed && !this.finishingAfterDispose) ||
          generation !== this.generation
        )
          return;
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType });
        chunks.length = 0;
        error ||= this.captureError;
        if (!error && !blob.size) error = "The recording is empty. Try again.";
        if (!error)
          this.completed({
            id: crypto.randomUUID(),
            bookId: book.id,
            title: book.title,
            createdAt: this.startedAt,
            seconds,
            blob,
          });
        else if (this.disposed) this.failed(error);
        this.emit("idle", error);
      };
      this.startedAt = Date.now();
      this.startedClock = performance.now();
      recorder.start(1000);
      stream.getTracks().forEach((track) => {
        track.onended = () => this.stop();
      });
      this.emit("recording");
      this.interval = setInterval(() => this.emit("recording"), 250);
      this.deadline = setTimeout(
        () => this.stop(),
        recordingLimits.seconds * 1000,
      );
    } catch (error) {
      if (this.disposed || generation !== this.generation) return;
      this.release();
      this.recorder = undefined;
      if (VoiceCapture.current === this) VoiceCapture.current = undefined;
      this.emit(
        "idle",
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone access was declined. Allow it in your browser and try again."
          : "Unable to record audio. Check your microphone and try again.",
      );
    }
  }

  stop() {
    if (this.phase === "requesting") {
      ++this.generation;
      if (VoiceCapture.current === this) VoiceCapture.current = undefined;
      this.emit("idle");
    } else if (this.recorder && this.phase === "recording") {
      this.stoppedSeconds = this.seconds();
      this.emit("finishing");
      clearInterval(this.interval);
      clearTimeout(this.deadline);
      const recorder = this.recorder;
      let failed = false;
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {
        failed = true;
        this.captureError =
          "Unable to record audio. Check your microphone and try again.";
      }
      this.release();
      if (this.recorder !== recorder) return;
      if (failed) {
        recorder.onstop?.(new Event("stop"));
        return;
      }
      this.completionTimeout = setTimeout(() => {
        this.captureError =
          "Unable to record audio. Check your microphone and try again.";
        recorder.onstop?.(new Event("stop"));
      }, 10_000);
    }
  }

  dispose() {
    this.disposed = true;
    if (this.phase === "recording") {
      this.finishingAfterDispose = true;
      this.stop();
      return;
    }
    if (this.phase === "finishing") {
      this.finishingAfterDispose = true;
      this.release();
      return;
    }
    ++this.generation;
    protectVoiceTake(this, false);
    if (VoiceCapture.current === this) VoiceCapture.current = undefined;
    if (this.recorder) {
      this.recorder.ondataavailable = null;
      this.recorder.onstop = null;
      this.recorder.onerror = null;
      try {
        if (this.recorder.state !== "inactive") this.recorder.stop();
      } catch {
        // Inactive capture cleanup must still release its tracks.
      }
      this.recorder = undefined;
    }
    this.release();
  }
}
