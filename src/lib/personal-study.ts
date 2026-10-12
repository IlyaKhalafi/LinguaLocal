import type { Progress, StudyDeck } from "./learning";
import {
  deckIdentifier,
  deckSchema,
  noteIdentifier,
  noteSchema,
} from "./progress-schema";

export function noteKey(kind: "word" | "lesson", id: string) {
  return `${kind === "word" ? "w" : "l"}/${id}`;
}

export function updateNote(
  progress: Progress,
  key: string,
  text: string,
): Progress | undefined {
  if (!noteIdentifier.safeParse(key).success) return;
  if (!text.trim()) {
    const notes = { ...progress.notes };
    delete notes[key];
    return { ...progress, notes };
  }
  const value = noteSchema.safeParse(text.trim());
  if (!value.success) return;
  if (
    value.data &&
    !Object.hasOwn(progress.notes, key) &&
    Object.keys(progress.notes).length >= 500
  )
    return;
  const notes = { ...progress.notes };
  if (value.data) notes[key] = value.data;
  else delete notes[key];
  return { ...progress, notes };
}

export function updateDeck(
  progress: Progress,
  id: string,
  input: StudyDeck,
): Progress | undefined {
  if (
    !deckIdentifier.safeParse(id).success ||
    !input ||
    typeof input !== "object"
  )
    return;
  const result = deckSchema.safeParse(input);
  if (
    !result.success ||
    (!Object.hasOwn(progress.decks, id) &&
      Object.keys(progress.decks).length >= 32)
  )
    return;
  return { ...progress, decks: { ...progress.decks, [id]: result.data } };
}

export function removeDeck(progress: Progress, id: string): Progress {
  const decks = { ...progress.decks };
  delete decks[id];
  return { ...progress, decks };
}
