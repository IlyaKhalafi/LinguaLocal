"use client";
import { useLocale } from "@/components/locale-provider";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, RotateCcw, Sparkles } from "lucide-react";
import { dayKey, shuffle } from "@/lib/learning";
import type { Word } from "@/lib/schema";
import { useProgress } from "./progress-provider";
import { EmptyState, PageHeading } from "./ui";

export function Flashcards({ words }: { words: Word[] }) {
  const { t } = useLocale();
  const { progress, review } = useProgress();
  const [mode, setMode] = useState("all");
  const [deck, setDeck] = useState<Word[]>([]);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const pool = words.filter((word) =>
    mode === "saved"
      ? progress.saved.includes(word.id)
      : mode === "due"
        ? !progress.reviews[word.id] ||
          progress.reviews[word.id].due <= dayKey()
        : true,
  );
  function start() {
    setDeck(shuffle(pool).slice(0, 20));
    setIndex(0);
    setFlipped(false);
    setStarted(true);
  }
  function answer(remembered: boolean) {
    review(deck[index].id, remembered);
    setIndex(index + 1);
    setFlipped(false);
  }
  const word = deck[index];
  return (
    <div className="game-panel">
      <PageHeading title={t("Flashcards")} />
      {!started ? (
        <>
          <div className="study-selector tabs">
            {[
              { id: "all", label: "All words" },
              { id: "saved", label: "Saved words" },
              { id: "due", label: "Due for review" },
            ].map((item) => (
              <button
                className={`tab ${mode === item.id ? "active" : ""}`}
                aria-pressed={mode === item.id}
                key={item.id}
                onClick={() => setMode(item.id)}
              >
                {t(item.label)}
              </button>
            ))}
          </div>
          {pool.length ? (
            <div className="panel">
              <Sparkles size={30} color="#8ea879" />
              <h2 style={{ marginTop: 15 }}>
                {t("{count} words available", { count: pool.length })}
              </h2>
              <p
                className="muted"
                style={{ fontSize: 12, margin: "15px 0 24px" }}
              >
                {t("Up to 20 cards per session.")}
              </p>
              <button className="button primary" onClick={start}>
                {t("Start review")}
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <EmptyState
              title={mode === "saved" ? t("No saved words") : t("No cards due")}
              description={
                mode === "saved"
                  ? t("Save words in the dictionary first.")
                  : t("Choose all words to practise now.")
              }
              action={
                <Link className="button primary" href="/dictionary">
                  {t("Open dictionary")}
                </Link>
              }
            />
          )}
        </>
      ) : !word ? (
        <div className="results-panel">
          <Sparkles size={34} color="#8ba775" />
          <h2>{t("Review complete")}</h2>
          <div className="results-score">
            {t("{count}", { count: deck.length })}
          </div>
          <p>{t("Words reviewed.")}</p>
          <div className="button-row">
            <button
              className="button primary"
              onClick={() => setStarted(false)}
            >
              {t("Review more words")}
            </button>
            <Link className="button secondary" href="/progress">
              {t("View progress")}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="game-progress">
            <span>
              {t("Card {current} of {total}", {
                current: index + 1,
                total: deck.length,
              })}
            </span>
            {mode === "saved" && <span>{t("Saved words")}</span>}
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(index / deck.length) * 100}%` }}
            />
          </div>
          <button
            className="flashcard"
            aria-expanded={flipped}
            onClick={() => setFlipped(!flipped)}
            aria-label={
              flipped
                ? t("Show word. {definition} {example}", {
                    definition: word.definition,
                    example: word.example,
                  })
                : t("Reveal meaning of {word}", { word: word.word })
            }
          >
            <p className="eyebrow">
              {flipped
                ? t("Meaning")
                : `${word.level} · ${word.part.toUpperCase()}`}
            </p>
            {flipped ? (
              <>
                <p className="definition" lang="en" dir="ltr">
                  {word.definition}
                </p>
                <p className="word-example" lang="en" dir="ltr">
                  “{word.example}”
                </p>
              </>
            ) : (
              <>
                <h2 lang="en" dir="ltr">
                  {word.word}
                </h2>
                <p className="phonetic" lang="en" dir="ltr">
                  {word.phonetic}
                </p>
              </>
            )}
            <span className="flashcard-hint">
              <RotateCcw size={12} />
              {t("Tap to flip")}
            </span>
          </button>
          {flipped && (
            <div className="flashcard-actions">
              <button
                className="button secondary"
                onClick={() => answer(false)}
              >
                <RotateCcw size={14} />
                {t("Review again")}
              </button>
              <button className="button primary" onClick={() => answer(true)}>
                <Check size={15} />
                {t("I remembered")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
