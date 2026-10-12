"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { downloadJson } from "./ui";
import { ClientNotice } from "./client-notice";
import { useLocale } from "./locale-provider";
import { progressSchema, recoverProgress } from "@/lib/progress-schema";
import {
  dayKey,
  emptyProgress,
  scheduleReview,
  getReview,
  type Attempt,
  type Progress,
  type ReviewRating,
  type AssignmentChecklist,
} from "@/lib/learning";
import {
  updateNote,
  updateDeck,
  removeDeck,
  updateChecklist,
} from "@/lib/personal-study";

const STORAGE_KEY = "lingualocal.progress.v1";
let cachedRaw: string | null | undefined;
let cached = emptyProgress;
let memoryFallback = false;
let storageConflict = false;
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((listener) => listener());
}
function snapshot(): Progress {
  if (typeof window === "undefined") return emptyProgress;
  if (memoryFallback) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (cachedRaw === undefined && raw === null) cachedRaw = null;
      else if (raw !== cachedRaw) storageConflict = true;
    } catch {
      /* Keep the recoverable in-memory copy. */
    }
    return cached;
  }
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
        if (raw && localStorage.getItem(`${STORAGE_KEY}.corrupt`) !== raw)
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
    if (storageConflict)
      throw new Error("Saved progress changed in another tab");
    localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    memoryFallback = false;
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
  const previous = cached;
  const current = snapshot();
  const next = transform(current);
  if (!next) {
    if (previous !== cached) emit();
    return false;
  }
  if (next === current) {
    if (previous !== cached) emit();
    return true;
  }
  update(() => next);
  return true;
}
const context = createContext<{
  progress: Progress;
  persistent: boolean;
  toggleSaved: (id: string) => void;
  complete: (id: string) => void;
  review: (id: string, remembered: boolean | ReviewRating) => void;
  setNote: (key: string, text: string, expected?: string) => boolean;
  editDeck: (
    id: string,
    name: string,
    tags: string[],
    creating?: boolean,
    expected?: string,
  ) => "saved" | "missing" | "full" | "invalid" | "conflict";
  setDeckWord: (
    deck: string,
    word: string,
    included: boolean,
  ) => "saved" | "missing" | "full";
  deleteDeck: (id: string) => void;
  removeAssignment: (id: string) => void;
  setAssignmentTask: (
    id: string,
    plan: Omit<AssignmentChecklist, "checked">,
    key: string,
    checked: boolean,
  ) => boolean;
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
    () =>
      memoryFallback
        ? storageConflict
          ? "conflict"
          : "unavailable"
        : "available",
    () => "available",
  );
  return (
    <context.Provider
      value={{
        progress,
        persistent: unavailable === "available",
        setNote: (key, text, expected) =>
          updateStudy((p) => {
            if (expected !== undefined && (p.notes[key] ?? "") !== expected)
              return;
            return updateNote(p, key, text);
          }),
        editDeck: (id, name, tags, creating = false, expected) => {
          let reason: "missing" | "full" | "invalid" | "conflict" = "invalid";
          const saved = updateStudy((p) => {
            const deck = Object.hasOwn(p.decks, id) ? p.decks[id] : undefined;
            if (!creating && !deck) {
              reason = "missing";
              return;
            }
            if (creating && Object.keys(p.decks).length >= 32) {
              reason = "full";
              return;
            }
            if (
              deck &&
              expected !== undefined &&
              JSON.stringify([deck.name, deck.tags]) !== expected
            ) {
              reason = "conflict";
              return;
            }
            return updateDeck(p, id, { name, tags, words: deck?.words ?? [] });
          });
          return saved ? "saved" : reason;
        },
        setDeckWord: (id, word, included) => {
          let reason: "missing" | "full" = "missing";
          const saved = updateStudy((p) => {
            const deck = p.decks[id];
            if (!deck || !Object.hasOwn(p.decks, id)) return;
            reason = "full";
            return updateDeck(p, id, {
              ...deck,
              words: included
                ? [...deck.words, word]
                : deck.words.filter((item) => item !== word),
            });
          });
          return saved ? "saved" : reason;
        },
        removeAssignment: (id) =>
          update((p) => {
            const assignments = { ...p.assignments };
            delete assignments[id];
            return { ...p, assignments };
          }),
        setAssignmentTask: (id, plan, key, checked) =>
          updateStudy((p) => updateChecklist(p, id, plan, key, checked)),
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
                [id]: scheduleReview(getReview(p.reviews, id), remembered),
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
        reset: () => {
          memoryFallback = false;
          storageConflict = false;
          try {
            localStorage.removeItem(`${STORAGE_KEY}.corrupt`);
          } catch {
            /* Reset still clears in-memory progress. */
          }
          update(() => ({ ...emptyProgress }));
        },
        restore: (input) => {
          const result = progressSchema.safeParse(input);
          if (!result.success) return false;
          memoryFallback = false;
          storageConflict = false;
          update(() => result.data);
          return true;
        },
      }}
    >
      {children}
      {unavailable !== "available" && (
        <ClientNotice>
          {t(
            unavailable === "conflict"
              ? "Another tab changed saved progress. Export this visit before reloading."
              : "Browser storage is unavailable. Progress will last for this visit.",
          )}
          {unavailable === "conflict" && (
            <span className="button-row">
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  downloadJson(progress, "lingualocal-unsaved-progress.json")
                }
              >
                {t("Export this visit")}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  memoryFallback = false;
                  storageConflict = false;
                  cachedRaw = undefined;
                  snapshot();
                  emit();
                  const heading =
                    document.querySelector<HTMLElement>("main h1");
                  heading?.setAttribute("tabindex", "-1");
                  heading?.focus({ preventScroll: true });
                }}
              >
                {t("Reload saved progress")}
              </button>
            </span>
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
