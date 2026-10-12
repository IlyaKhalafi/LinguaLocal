"use client";
import { useLocale } from "@/components/locale-provider";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { distinctGameWords, shuffle } from "@/lib/learning";
import { useFocusOnChange } from "@/lib/use-focus-on-change";
import type { Word } from "@/lib/schema";
import { PageHeading } from "./ui";
import { useProgress } from "./progress-provider";

export function Matching({ words }: { words: Word[] }) {
  const { t } = useLocale();
  const [left, setLeft] = useState<Word[]>([]);
  const [right, setRight] = useState<Word[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [tries, setTries] = useState(0);
  const [message, setMessage] = useState("");
  const [messageVersion, setMessageVersion] = useState(0);
  function announce(text: string) {
    setMessage(text);
    setMessageVersion((version) => version + 1);
  }
  const focusTarget = useFocusOnChange(`${left.length}-${matched.length}`);
  const nextWord = left.find((word) => !matched.includes(word.id));
  const { record } = useProgress();
  const pool = useMemo(() => distinctGameWords(words), [words]);
  function start() {
    const selection = shuffle(pool).slice(0, 6);
    setLeft(selection);
    setRight(shuffle(selection));
    setMatched([]);
    setChosen(null);
    setTries(0);
    announce("");
  }
  function pair(id: string) {
    if (!chosen) {
      announce("Choose a word first.");
      return;
    }
    const nextTries = tries + 1;
    setTries(nextTries);
    if (chosen === id) {
      const nextMatched = [...matched, id];
      setMatched(nextMatched);
      setChosen(null);
      announce("Matched.");
      if (nextMatched.length === left.length)
        record({
          title: "Matching",
          score: left.length,
          total: nextTries,
        });
    } else {
      announce("Incorrect. Try another meaning.");
    }
  }
  const done = left.length > 0 && matched.length === left.length;
  return (
    <div className="game-panel">
      <Link className="back-link" href="/games">
        <ArrowLeft size={14} />
        {t("Games")}
      </Link>
      <PageHeading title={t("Matching")} />
      {done ? (
        <div className="results-panel">
          <Sparkles size={35} color="#98a780" />
          <h2 ref={focusTarget} tabIndex={-1}>
            {t("Round complete")}
          </h2>
          <div className="results-score">
            {t("{count}", { count: matched.length })}
          </div>
          <p>
            {t("{count} pairs matched in {tries} attempts.", {
              count: matched.length,
              tries,
            })}
          </p>
          <div className="button-row">
            <button className="button primary" onClick={start}>
              {t("Play again")}
            </button>
            <Link className="button secondary" href="/progress">
              {t("View progress")}
            </Link>
          </div>
        </div>
      ) : !left.length ? (
        <>
          <div className="panel">
            <p className="muted" style={{ marginBottom: 20, fontSize: 12 }}>
              {t("Choose a word, then its meaning.")}
            </p>
            {pool.length < 4 && (
              <p
                id="matching-pool-help"
                className="inline-message game-pool-help"
                role="status"
              >
                {t("This selection needs four distinct words.")}
              </p>
            )}
            <button
              className="button primary"
              disabled={pool.length < 4}
              aria-describedby={
                pool.length < 4 ? "matching-pool-help" : undefined
              }
              onClick={start}
            >
              {t("Start matching")}
              <ArrowRight size={14} />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="game-progress">
            <span>
              {t("{count} of {total} pairs found", {
                count: matched.length,
                total: left.length,
              })}
            </span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(matched.length / left.length) * 100}%` }}
            />
          </div>
          <div className="matching-grid">
            <div className="matching-column">
              {left.map((word) => (
                <button
                  ref={word.id === nextWord?.id ? focusTarget : undefined}
                  lang="en"
                  dir="ltr"
                  className={`matching-tile ${chosen === word.id ? "chosen" : ""} ${matched.includes(word.id) ? "matched" : ""}`}
                  key={word.id}
                  disabled={matched.includes(word.id)}
                  aria-pressed={chosen === word.id}
                  onClick={() => {
                    setChosen(word.id);
                    announce("");
                  }}
                >
                  {word.word}
                  {matched.includes(word.id) && " ✓"}
                </button>
              ))}
            </div>
            <div className="matching-column">
              {right.map((word) => (
                <button
                  lang="en"
                  dir="ltr"
                  className={`matching-tile ${matched.includes(word.id) ? "matched" : ""}`}
                  key={word.id}
                  disabled={matched.includes(word.id)}
                  onClick={() => pair(word.id)}
                >
                  {word.definition}
                </button>
              ))}
            </div>
          </div>
          <p
            className={
              message && message !== "Matched." ? "study-summary" : "sr-only"
            }
            role="status"
          >
            <span key={messageVersion}>{t(message)}</span>
          </p>
        </>
      )}
    </div>
  );
}
