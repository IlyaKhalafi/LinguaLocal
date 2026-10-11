"use client";
import { useSyncExternalStore } from "react";
import { z } from "zod";
import { packSchema, type ContentPack } from "./schema";

const key = "lingualocal.studio-draft.v1";
const event = "lingualocal-draft-changed";
const schema = z.object({ content: packSchema, version: z.string() });
function subscribe(callback: () => void) {
  window.addEventListener(event, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(event, callback);
    window.removeEventListener("storage", callback);
  };
}
function read() {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function useStudioDraft() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  try {
    const parsed = schema.safeParse(raw ? JSON.parse(raw) : null);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export function storeDraft(content: ContentPack, version: string) {
  try {
    localStorage.setItem(key, JSON.stringify({ content, version }));
    window.dispatchEvent(new Event(event));
    return true;
  } catch {
    return false;
  }
}
export function clearDraft() {
  try {
    localStorage.removeItem(key);
    window.dispatchEvent(new Event(event));
  } catch {
    /* Draft removal is optional when browser storage is blocked. */
  }
}
