"use client";
import { useLocale } from "@/components/locale-provider";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { dayKey, shuffle } from "@/lib/learning";
import { useFocusOnChange } from "@/lib/use-focus-on-change";
import type { Word } from "@/lib/schema";
import type { LessonStudyScope } from "@/lib/lesson-study";
import { useProgress } from "./progress-provider";
import { EmptyState, PageHeading } from "./ui";

export function Flashcards({
  words,
  scope,
}: {
  words: Word[];
  scope?: LessonStudyScope;
}) {
  const { t } = useLocale();
  const { progress, review } = useProgress();
  const [mode, setMode] = useState("all");
  const [deck, setDeck] = useState<Word[]>(scope ? words : []);
  const [started, setStarted] = useState(Boolean(scope && words.length));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const focusTarget = useFocusOnChange(`${started}-${index}`);
  const pool = words.filter((word) =>
    mode === "saved"
      ? progress.saved.includes(word.id)
      : mode === "due"
        ? !progress.reviews[word.id] ||
          progress.reviews[word.id].due <= dayKey()
        : true,
  );
  function start(selection = pool) {
    setDeck(scope ? words : shuffle(selection).slice(0, 20));
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
      {scope && (
        <Link className="back-link" href={`/lessons/${scope.id}`}>
          <ArrowLeft size={14} />
          {t("Back to lesson")}
        </Link>
      )}
      <PageHeading
        title={t("Flashcards")}
        eyebrow={
          scope && (
            <bdi lang="en" dir="ltr">
              {scope.title}
            </bdi>
          )
        }
      />
      {!started ? (
        <>
          {scope ? (
            <EmptyState
              title={t("No words for this lesson")}
              action={
                <Link
                  className="button primary"
                  href={scope.next ? `/lessons/${scope.next.id}` : "/lessons"}
                >
                  {t(scope.next ? "Next lesson" : "All lessons")}
                </Link>
              }
            />
          ) : (
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
                  <h2
                    ref={focusTarget}
                    tabIndex={-1}
                    style={{ marginBottom: 20 }}
                  >
                    {t("{count} words available", { count: pool.length })}
                  </h2>
                  <button className="button primary" onClick={() => start()}>
                    {t("Start review")}
                    <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <EmptyState
                  title={
                    mode === "saved" ? t("No saved words") : t("No cards due")
                  }
                  description={
                    mode === "saved"
                      ? t("Save words in the dictionary first.")
                      : t("Choose all words to practise now.")
                  }
                  action={
                    mode === "saved" ? (
                      <Link
                        className="button primary"
                        ref={focusTarget}
                        href="/dictionary"
                      >
                        {t("Open dictionary")}
                      </Link>
                    ) : (
                      <button
                        className="button primary"
                        ref={focusTarget}
                        onClick={() => {
                          setMode("all");
                          start(words);
                        }}
                      >
                        {t("Review all words")}
                      </button>
                    )
                  }
                />
              )}
            </>
          )}
        </>
      ) : !word ? (
        <div className="results-panel">
          <Sparkles size={34} color="#8ba775" />
          <h2 ref={focusTarget} tabIndex={-1}>
            {t("Review complete")}
          </h2>
          <div className="results-score">
            {t("{count}", { count: deck.length })}
          </div>
          <p>{t("Words reviewed.")}</p>
          <div className="button-row">
            {scope ? (
              <>
                <Link
                  className="button primary"
                  href={scope.next ? `/lessons/${scope.next.id}` : "/lessons"}
                >
                  {t(scope.next ? "Next lesson" : "All lessons")}
                  <ArrowRight size={14} />
                </Link>
                <button className="button secondary" onClick={() => start()}>
                  {t("Restart review")}
                </button>
              </>
            ) : (
              <>
                <button
                  className="button primary"
                  onClick={() => setStarted(false)}
                >
                  {t("Review more words")}
                </button>
                <Link className="button secondary" href="/progress">
                  {t("View progress")}
                </Link>
              </>
            )}
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
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(index / deck.length) * 100}%` }}
            />
          </div>
          <button
            className="flashcard"
            ref={focusTarget}
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
            {index === 0 && (
              <span className="flashcard-hint">
                <RotateCcw size={12} />
                {t("Tap to flip")}
              </span>
            )}
          </button>
          {flipped && (
            <div className="flashcard-actions">
              <button
                className="button secondary"
                onClick={() => answer(false)}
              >
                <RotateCcw size={14} />
                {t("Not yet")}
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
