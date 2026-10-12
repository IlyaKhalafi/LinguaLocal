"use client";

import { useId, useState } from "react";
import { useLocale } from "./locale-provider";
import { useProgress } from "./progress-provider";

export function DeckManager() {
  const { t } = useLocale();
  const { progress, editDeck, deleteDeck } = useProgress();
  const [selection, setSelection] = useState("");
  const [draft, setDraft] = useState<{ name: string; tags: string } | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const field = useId();
  const existing = Object.hasOwn(progress.decks, selection)
    ? progress.decks[selection]
    : undefined;
  const missing = Boolean(
    selection && !Object.hasOwn(progress.decks, selection),
  );
  const value = draft ?? {
    name: existing?.name ?? "",
    tags: existing?.tags.join(", ") ?? "",
  };
  return (
    <details className="deck-manager">
      <summary>{t("My decks")}</summary>
      <form
        className="panel"
        onSubmit={(event) => {
          event.preventDefault();
          if (missing) return;
          if (!value.name.trim()) {
            setMessage("Enter a deck name.");
            document.getElementById(`${field}-name`)?.focus();
            return;
          }
          const id =
            selection ||
            (crypto.randomUUID?.() ??
              `deck-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
          const tags = value.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);
          if (!existing && Object.keys(progress.decks).length >= 32) {
            setMessage("Deck limit reached.");
            return;
          }
          if (!editDeck(id, value.name, tags, !selection)) {
            setMessage("Deck not saved. Use up to 8 tags of 24 characters.");
            return;
          }
          setSelection(id);
          setDraft(null);
          setMessage("Deck saved.");
        }}
      >
        <div className="form-field">
          <label htmlFor={`${field}-selection`}>{t("Edit deck")}</label>
          <select
            id={`${field}-selection`}
            value={selection}
            onChange={(event) => {
              if (
                draft &&
                !missing &&
                (draft.name !== (existing?.name ?? "") ||
                  draft.tags !== (existing?.tags.join(", ") ?? "")) &&
                !window.confirm(t("Discard unsaved deck changes?"))
              )
                return;
              setSelection(event.target.value);
              setDraft(missing && !event.target.value ? draft : null);
              setMessage("");
            }}
          >
            <option value="">{t("New deck")}</option>
            {missing && (
              <option value={selection} disabled>
                {t("Deck removed")}
              </option>
            )}
            {Object.entries(progress.decks).map(([id, deck]) => (
              <option key={id} value={id}>
                {deck.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor={`${field}-name`}>{t("Deck name")}</label>
          <input
            id={`${field}-name`}
            dir="auto"
            required
            maxLength={64}
            value={value.name}
            onChange={(event) => {
              setDraft({ ...value, name: event.target.value });
              setMessage("");
            }}
          />
        </div>
        <div className="form-field">
          <label htmlFor={`${field}-tags`}>
            {t("Tags, separated by commas")}
          </label>
          <input
            id={`${field}-tags`}
            dir="auto"
            maxLength={256}
            value={value.tags}
            onChange={(event) => {
              setDraft({ ...value, tags: event.target.value });
              setMessage("");
            }}
          />
        </div>
        <div className="button-row">
          <button className="button primary" type="submit" disabled={missing}>
            {t("Save deck")}
          </button>
          {existing && (
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                if (
                  !window.confirm(
                    t("Delete this deck? Your words and notes stay saved."),
                  )
                )
                  return;
                deleteDeck(selection);
                setSelection("");
                setDraft(null);
                setMessage("Deck deleted.");
                document.getElementById(`${field}-name`)?.focus();
              }}
            >
              {t("Delete deck")}
            </button>
          )}
        </div>
        <p
          className={missing || message ? "personal-note-status" : "sr-only"}
          role="status"
        >
          {t(missing ? "This deck was removed in another tab." : message)}
        </p>
      </form>
    </details>
  );
}
