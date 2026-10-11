"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { z } from "zod";
import {
  dayKey,
  emptyProgress,
  scheduleReview,
  type Attempt,
  type Progress,
} from "@/lib/learning";

const STORAGE_KEY = "lingualocal.progress.v1";
const progressSchema = z.object({
  saved: z.array(z.string()).max(20000),
  completed: z.array(z.string()).max(1000),
  reviews: z.record(
    z.string(),
    z.object({
      interval: z.number().min(0).max(180),
      due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      repetitions: z.number().int().nonnegative(),
    }),
  ),
  attempts: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        score: z.number().nonnegative(),
        total: z.number().positive(),
        date: z.string(),
      }),
    )
    .max(100),
  activity: z.record(z.string(), z.number().nonnegative()),
  goal: z.number().int().min(1).max(100),
});
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
  try { raw = localStorage.getItem(STORAGE_KEY); } catch {
    memoryFallback = true;
    return cached;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const result = progressSchema.safeParse(raw ? JSON.parse(raw) : emptyProgress);
      if (!result.success) throw new Error("Invalid progress");
      cached = result.data;
    } catch {
      cached = emptyProgress;
      try { if (raw) localStorage.setItem(`${STORAGE_KEY}.corrupt`, raw); } catch { /* The original value remains until the next save. */ }
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
const context = createContext<{
  progress: Progress;
  persistent: boolean;
  toggleSaved: (id: string) => void;
  complete: (id: string) => void;
  review: (id: string, remembered: boolean) => void;
  record: (attempt: Omit<Attempt, "date" | "id">) => void;
  setGoal: (goal: number) => void;
  reset: () => void;
  restore: (input: unknown) => boolean;
} | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const progress = useSyncExternalStore(
    subscribe,
    snapshot,
    () => emptyProgress,
  );
  return (
    <context.Provider
      value={{
        progress,
        persistent: !memoryFallback,
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
      {memoryFallback && (
        <div className="storage-notice" role="status">
          Browser storage is unavailable. Progress will last for this visit.
        </div>
      )}
    </context.Provider>
  );
}

export function useProgress() {
  const value = useContext(context);
  if (!value) throw new Error("ProgressProvider is required");
  return value;
}
