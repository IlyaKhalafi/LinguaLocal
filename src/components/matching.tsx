"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { shuffle } from "@/lib/learning";
import type { Word } from "@/lib/schema";
import { PageHeading } from "./ui";
import { useProgress } from "./progress-provider";
import { PracticeGuide } from "./practice-guide";

export function Matching({ words }: { words: Word[] }) {
  const [left, setLeft] = useState<Word[]>([]);
  const [right, setRight] = useState<Word[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [tries, setTries] = useState(0);
  const [message, setMessage] = useState("");
  const { record } = useProgress();
  function start() {
    const selection = shuffle(words).slice(0, 6);
    setLeft(selection);
    setRight(shuffle(selection));
    setMatched([]);
    setChosen(null);
    setTries(0);
    setMessage("");
  }
  function pair(id: string) {
    if (!chosen) {
      setMessage("Choose a word on the left first.");
      return;
    }
    const nextTries = tries + 1;
    setTries(nextTries);
    if (chosen === id) {
      const nextMatched = [...matched, id];
      setMatched(nextMatched);
      setChosen(null);
      setMessage("A perfect pair. Keep going!");
      if (nextMatched.length === left.length)
        record({
          title: "Perfect pairs",
          score: left.length,
          total: nextTries,
        });
    } else {
      setMessage(
        "Those two haven’t found their match yet. Try another meaning.",
      );
    }
  }
  const done = left.length > 0 && matched.length === left.length;
  return (
    <div className="game-panel">
      <Link className="back-link" href="/games">
        <ArrowLeft size={14} />
        Practice & play
      </Link>
      <PageHeading
        eyebrow="THE MATCHING GAME"
        title="Perfect pairs"
        description="Pick a word, then find its meaning. Some things just belong together."
      />
      {done ? (
        <div className="results-panel">
          <Sparkles size={35} color="#98a780" />
          <h2>Everything found its place.</h2>
          <div className="results-score">{matched.length}</div>
          <p>
            You matched {matched.length} pairs in {tries} attempts. Another
            little step forward.
          </p>
          <div className="button-row">
            <button className="button primary" onClick={start}>
              Find some new pairs
            </button>
            <Link className="button secondary" href="/progress">
              See your progress
            </Link>
          </div>
        </div>
      ) : !left.length ? (
        <>
          <div className="panel">
            <h2>Bring words and meanings together.</h2>
            <p
              className="muted"
              style={{ margin: "15px 0 25px", fontSize: 12 }}
            >
              Six pairs, no timer, and plenty of space to think.
            </p>
            <button className="button primary" onClick={start}>
              Let’s find a match
              <ArrowRight size={14} />
            </button>
          </div>
          <PracticeGuide words={words} />
        </>
      ) : (
        <>
          <div className="game-progress">
            <span>
              {matched.length} of {left.length} pairs found
            </span>
            <span>{tries} attempts</span>
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
                  className={`matching-tile ${chosen === word.id ? "chosen" : ""} ${matched.includes(word.id) ? "matched" : ""}`}
                  key={word.id}
                  disabled={matched.includes(word.id)}
                  aria-pressed={chosen === word.id}
                  onClick={() => {
                    setChosen(word.id);
                    setMessage("");
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
          <p className="study-summary" role="status">
            {message ||
              "Choose a word on the left, then a meaning on the right."}
          </p>
        </>
      )}
    </div>
  );
}
