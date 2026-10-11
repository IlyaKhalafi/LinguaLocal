"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, RotateCcw, Sparkles } from "lucide-react";
import { dayKey, shuffle } from "@/lib/learning";
import type { Word } from "@/lib/schema";
import { useProgress } from "./progress-provider";
import { EmptyState, PageHeading } from "./ui";
import { PracticeGuide } from "./practice-guide";

export function Flashcards({ words }: { words: Word[] }) {
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
      <PageHeading
        eyebrow="A LITTLE REPETITION. A LASTING MEMORY."
        title="Make new words stick."
        description="Flip a card, find the meaning, and let your vocabulary grow."
      />
      {!started ? (
        <>
          <div className="study-selector tabs">
            {[
              { id: "all", label: "All words" },
              { id: "saved", label: "My saved words" },
              { id: "due", label: "Ready for review" },
            ].map((item) => (
              <button
                className={`tab ${mode === item.id ? "active" : ""}`}
                aria-pressed={mode === item.id}
                key={item.id}
                onClick={() => setMode(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {pool.length ? (
            <div className="panel">
              <Sparkles size={30} color="#8ea879" />
              <h2 style={{ marginTop: 15 }}>
                {pool.length} words. Plenty of possibilities.
              </h2>
              <p
                className="muted"
                style={{ fontSize: 12, margin: "15px 0 24px" }}
              >
                Study up to 20 cards at a time. Tell us what you remember and
                we’ll plan your next review.
              </p>
              <button className="button primary" onClick={start}>
                Start a little practice
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <EmptyState
              title={
                mode === "saved"
                  ? "Collect a few words first."
                  : "All caught up. Nicely done."
              }
              description={
                mode === "saved"
                  ? "Save words in the dictionary to create your own study collection."
                  : "Your next review will be ready soon. You can explore all words in the meantime."
              }
              action={
                <Link className="button primary" href="/dictionary">
                  Explore the dictionary
                </Link>
              }
            />
          )}
          <PracticeGuide words={pool} />
        </>
      ) : !word ? (
        <div className="results-panel">
          <Sparkles size={34} color="#8ba775" />
          <h2>A little practice, a little progress.</h2>
          <div className="results-score">{deck.length}</div>
          <p>
            Words reviewed. The ones you remember will return later, and the
            tricky ones will be ready to practise again today.
          </p>
          <div className="button-row">
            <button
              className="button primary"
              onClick={() => setStarted(false)}
            >
              Choose another deck
            </button>
            <Link className="button secondary" href="/progress">
              See your progress
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="game-progress">
            <span>
              Card {index + 1} of {deck.length}
            </span>
            <span>
              {mode === "saved"
                ? "Your word collection"
                : "Grow your vocabulary"}
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
            aria-expanded={flipped}
            onClick={() => setFlipped(!flipped)}
            aria-label={
              flipped
                ? `Show word. ${word.definition} ${word.example}`
                : `Reveal meaning of ${word.word}`
            }
          >
            <p className="eyebrow">
              {flipped
                ? "THE MEANING"
                : `${word.level} · ${word.part.toUpperCase()}`}
            </p>
            {flipped ? (
              <>
                <p className="definition">{word.definition}</p>
                <p className="word-example">“{word.example}”</p>
              </>
            ) : (
              <>
                <h2>{word.word}</h2>
                <p className="phonetic">{word.phonetic}</p>
              </>
            )}
            <span className="flashcard-hint">
              <RotateCcw size={12} />
              Click or tap to flip
            </span>
          </button>
          {flipped && (
            <div className="flashcard-actions">
              <button
                className="button secondary"
                onClick={() => answer(false)}
              >
                <RotateCcw size={14} />
                Let’s practise again
              </button>
              <button className="button primary" onClick={() => answer(true)}>
                <Check size={15} />I remembered
              </button>
            </div>
          )}
          <p className="study-summary">No rush. Let the word settle in.</p>
        </>
      )}
    </div>
  );
}
