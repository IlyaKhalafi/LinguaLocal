import type { Progress, StudyDeck, AssignmentChecklist } from "./learning";
import {
  checklistIdentifier,
  checklistSchema,
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

export function updateChecklist(
  progress: Progress,
  id: string,
  plan: Omit<AssignmentChecklist, "checked">,
  key: string,
  checked: boolean,
): Progress | undefined {
  if (!checklistIdentifier.safeParse(id).success || !plan.tasks.includes(key))
    return;
  const existing = Object.hasOwn(progress.assignments, id)
    ? progress.assignments[id]
    : undefined;
  if (!existing && !checked) return progress;
  const result = checklistSchema.safeParse({
    ...plan,
    checked: checked
      ? [...(existing?.checked ?? []), key]
      : (existing?.checked ?? []).filter((value) => value !== key),
  });
  if (!result.success) return;
  if (
    !existing &&
    Object.keys(progress.assignments).length >= 64 &&
    result.data.checked.length
  )
    return;
  const assignments = { ...progress.assignments };
  assignments[id] = result.data;
  return { ...progress, assignments };
}
