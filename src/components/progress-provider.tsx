"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ClientNotice } from "./client-notice";
import { useLocale } from "./locale-provider";
import { progressSchema, recoverProgress } from "@/lib/progress-schema";
import {
  dayKey,
  emptyProgress,
  scheduleReview,
  type Attempt,
  type Progress,
  type StudyDeck,
  type ReviewRating,
} from "@/lib/learning";
import { updateNote, updateDeck, removeDeck } from "@/lib/personal-study";

const STORAGE_KEY = "lingualocal.progress.v1";
let cachedRaw: string | null | undefined;
let cached = emptyProgress;
let memoryFallback = false;
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((listener) => listener());
}
function snapshot(): Progress {
  if (typeof window === "undefined") return emptyProgress;
  if (memoryFallback) return cached;
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    memoryFallback = true;
    return cached;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    let input: unknown;
    try {
      input = raw ? JSON.parse(raw) : emptyProgress;
      const result = progressSchema.safeParse(input);
      if (!result.success) throw new Error("Invalid progress");
      cached = result.data;
    } catch {
      cached = recoverProgress(input);
      try {
        if (raw && localStorage.getItem(`${STORAGE_KEY}.corrupt`) === null)
          localStorage.setItem(`${STORAGE_KEY}.corrupt`, raw);
      } catch {
        /* The original value remains until the next save. */
      }
    }
  }
  return cached;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
function update(transform: (progress: Progress) => Progress) {
  cached = transform(snapshot());
  const raw = JSON.stringify(cached);
  try {
    localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
  } catch {
    memoryFallback = true;
  }
  emit();
}
function active(progress: Progress): Progress {
  const day = dayKey();
  return {
    ...progress,
    activity: {
      ...progress.activity,
      [day]: (progress.activity[day] ?? 0) + 1,
    },
  };
}
function updateStudy(transform: (progress: Progress) => Progress | undefined) {
  const next = transform(snapshot());
  if (!next) return false;
  update(() => next);
  return true;
}
const context = createContext<{
  progress: Progress;
  persistent: boolean;
  toggleSaved: (id: string) => void;
  complete: (id: string) => void;
  review: (id: string, remembered: boolean | ReviewRating) => void;
  setNote: (key: string, text: string) => boolean;
  setDeck: (id: string, deck: StudyDeck) => boolean;
  deleteDeck: (id: string) => void;
  record: (attempt: Omit<Attempt, "date" | "id">) => void;
  setGoal: (goal: number) => void;
  reset: () => void;
  restore: (input: unknown) => boolean;
} | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const progress = useSyncExternalStore(
    subscribe,
    snapshot,
    () => emptyProgress,
  );
  const unavailable = useSyncExternalStore(
    subscribe,
    () => memoryFallback,
    () => false,
  );
  return (
    <context.Provider
      value={{
        progress,
        persistent: !unavailable,
        setNote: (key, text) => updateStudy((p) => updateNote(p, key, text)),
        setDeck: (id, deck) => updateStudy((p) => updateDeck(p, id, deck)),
        deleteDeck: (id) => update((p) => removeDeck(p, id)),
        toggleSaved: (id) =>
          update((p) => ({
            ...p,
            saved: p.saved.includes(id)
              ? p.saved.filter((item) => item !== id)
              : [...p.saved, id],
          })),
        complete: (id) =>
          update((p) =>
            p.completed.includes(id)
              ? p
              : active({ ...p, completed: [...p.completed, id] }),
          ),
        review: (id, remembered) =>
          update((p) =>
            active({
              ...p,
              reviews: {
                ...p.reviews,
                [id]: scheduleReview(p.reviews[id], remembered),
              },
            }),
          ),
        record: (attempt) =>
          update((p) =>
            active({
              ...p,
              attempts: [
                {
                  ...attempt,
                  id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
                  date: new Date().toISOString(),
                },
                ...p.attempts,
              ].slice(0, 100),
            }),
          ),
        setGoal: (goal) =>
          update((p) => ({
            ...p,
            goal: Math.max(1, Math.min(100, Math.round(goal))),
          })),
        reset: () => update(() => ({ ...emptyProgress })),
        restore: (input) => {
          const result = progressSchema.safeParse(input);
          if (!result.success) return false;
          update(() => result.data);
          return true;
        },
      }}
    >
      {children}
      {unavailable && (
        <ClientNotice>
          {t(
            "Browser storage is unavailable. Progress will last for this visit.",
          )}
        </ClientNotice>
      )}
    </context.Provider>
  );
}

export function useProgress() {
  const value = useContext(context);
  if (!value) throw new Error("ProgressProvider is required");
  return value;
}
