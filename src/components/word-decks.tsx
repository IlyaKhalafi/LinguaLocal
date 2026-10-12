"use client";

import { useId, useRef, useState } from "react";
import { Layers } from "lucide-react";
import { useLocale } from "./locale-provider";
import { useProgress } from "./progress-provider";

export function WordDecks({ id, word }: { id: string; word: string }) {
  const { t, locale, dir } = useLocale();
  const { progress, setDeckWord } = useProgress();
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const details = useRef<HTMLDetailsElement>(null);
  const field = useId();
  const decks = Object.entries(progress.decks);
  if (!decks.length) return null;
  const label = t("Study decks for {word}", { word });
  return (
    <details
      className="personal-note personal-note-compact word-decks no-print"
      dir="ltr"
      lang={locale}
      ref={details}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
        if (!event.currentTarget.open) setMessage("");
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          if (details.current) {
            details.current.open = false;
            details.current
              .querySelector("summary")
              ?.focus({ preventScroll: true });
          }
        }
      }}
    >
      <summary className="icon-button" aria-label={label} title={label}>
        <Layers size={16} aria-hidden="true" />
      </summary>
      {open && (
        <fieldset className="personal-note-body" dir={dir}>
          <legend>{t("My decks")}</legend>
          <div className="deck-memberships">
            {decks.map(([deckId, deck]) => (
              <label key={deckId} htmlFor={`${field}-${deckId}`}>
                <input
                  id={`${field}-${deckId}`}
                  type="checkbox"
                  checked={deck.words.includes(id)}
                  onChange={(event) => {
                    const result = setDeckWord(
                      deckId,
                      id,
                      event.target.checked,
                    );
                    setMessage(
                      result === "saved"
                        ? ""
                        : result === "missing"
                          ? "The deck was removed."
                          : "Deck word limit reached.",
                    );
                  }}
                />
                <bdi>{deck.name}</bdi>
              </label>
            ))}
          </div>
          <p className={message ? "inline-message" : "sr-only"} role="status">
            {t(message)}
          </p>
        </fieldset>
      )}
    </details>
  );
}
