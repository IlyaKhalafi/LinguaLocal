import { recordingLimits, type Recording } from "./recording";
import type { Book } from "./schema";

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
  private generation = 0;
  private disposed = false;
  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private interval?: ReturnType<typeof setInterval>;
  private deadline?: ReturnType<typeof setTimeout>;
  private phase: CaptureState["phase"] = "idle";
  private startedAt = 0;

  constructor(
    private update: (state: CaptureState) => void,
    private completed: (recording: Recording) => void,
  ) {}

  private seconds() {
    return Math.min(
      recordingLimits.seconds,
      Math.max(0.01, (Date.now() - this.startedAt) / 1000),
    );
  }

  private emit(phase: CaptureState["phase"], error = "") {
    this.phase = phase;
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
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
  }

  async start(book: Pick<Book, "id" | "title">) {
    if (this.disposed || this.phase !== "idle") return;
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
    this.startedAt = Date.now();
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
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error("unsupported-recorder");
      const recorder = new MediaRecorder(stream, { mimeType });
      this.recorder = recorder;
      const chunks: Blob[] = [];
      let bytes = 0;
      let error = "";
      recorder.ondataavailable = (event) => {
        if (this.disposed || generation !== this.generation || error) return;
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
        const seconds = this.seconds();
        this.release();
        this.recorder = undefined;
        if (this.disposed || generation !== this.generation) return;
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType });
        chunks.length = 0;
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
        this.emit("idle", error);
      };
      this.startedAt = Date.now();
      recorder.start(1000);
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
      this.emit("idle");
    } else if (this.recorder?.state === "recording") {
      this.emit("finishing");
      clearInterval(this.interval);
      clearTimeout(this.deadline);
      this.recorder.stop();
      this.release();
    }
  }

  dispose() {
    this.disposed = true;
    ++this.generation;
    if (this.recorder) {
      this.recorder.ondataavailable = null;
      this.recorder.onstop = null;
      this.recorder.onerror = null;
      if (this.recorder.state !== "inactive") this.recorder.stop();
      this.recorder = undefined;
    }
    this.release();
  }
}
