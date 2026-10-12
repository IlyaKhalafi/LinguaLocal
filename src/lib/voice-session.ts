"use client";

import type { Recording } from "./recording";
import { saveRecording } from "./recordings";

export type VoiceSession = {
  draft: Recording | null;
  busy: boolean;
  error: string;
  message: string;
};

export const emptyVoiceSession: VoiceSession = {
  draft: null,
  busy: false,
  error: "",
  message: "",
};
let session = emptyVoiceSession;
const listeners = new Set<() => void>();

function update(next: VoiceSession) {
  session = next;
  listeners.forEach((listener) => listener());
}

export function voiceSession() {
  return session;
}

export function subscribeVoiceSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearVoiceFeedback() {
  update({ ...session, error: "", message: "" });
}

export function voiceCaptureFailed(error: string) {
  update({ ...session, error, message: "" });
}

export function discardVoiceTake() {
  if (session.busy) return;
  update(emptyVoiceSession);
}

export async function saveVoiceTake(take: Recording) {
  if (session.busy) return false;
  update({ draft: take, busy: true, error: "", message: "" });
  try {
    await saveRecording(take);
    update({ ...emptyVoiceSession, message: "Take saved" });
    return true;
  } catch (error) {
    const full =
      (error instanceof Error && error.message === "recordings-full") ||
      (error instanceof DOMException && error.name === "QuotaExceededError");
    update({
      draft: take,
      busy: false,
      message: "",
      error: full
        ? "Recording storage is full. Delete a saved take or download this take."
        : "Unable to save on this device. Download your take or try again.",
    });
    return false;
  }
}
