"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { makeQuiz } from "@/lib/learning";
import { levels, type Word } from "@/lib/schema";
import { useProgress } from "./progress-provider";
import { PageHeading } from "./ui";

export function Quiz({ words }: { words: Word[] }) {
  const [level, setLevel] = useState("");
  const [questions, setQuestions] = useState<ReturnType<typeof makeQuiz>>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [checked, setChecked] = useState(false);
  const { record } = useProgress();
  const pool = words.filter((word) => !level || word.level === level);
  function start() {
    setQuestions(makeQuiz(pool));
    setIndex(0);
    setScore(0);
    setSelected(null);
    setChecked(false);
    setFinished(false);
  }
  function next() {
    if (index === questions.length - 1) {
      record({ title: "Vocabulary quiz", score, total: questions.length });
      setFinished(true);
    } else {
      setIndex(index + 1);
      setSelected(null);
      setChecked(false);
    }
  }
  const question = questions[index];
  return (
    <div className="game-panel">
      <Link className="back-link" href="/games">
        <ArrowLeft size={14} />
        Games
      </Link>
      <PageHeading title="Vocabulary quiz" />
      {finished ? (
        <div className="results-panel">
          <Sparkles size={35} color="#88a373" />
          <h2>Quiz complete</h2>
          <div className="results-score">
            {score}
            <span style={{ fontSize: 15, marginTop: -35 }}>
              of {questions.length}
            </span>
          </div>
          <p>
            {score === questions.length
              ? "All answers correct."
              : "Review the missed words and try again."}
          </p>
          <div className="button-row">
            <button className="button primary" onClick={start}>
              <RotateCcw size={14} />
              Play again
            </button>
            <Link className="button secondary" href="/progress">
              View progress
            </Link>
          </div>
        </div>
      ) : !question ? (
        <>
          <div className="panel">
            <h2>Quiz setup</h2>
            <p
              className="muted"
              style={{ fontSize: 12, margin: "14px 0 24px" }}
            >
              Up to 8 questions per round.
            </p>
            <div className="form-field">
              <label htmlFor="quiz-level">Level</label>
              <select
                id="quiz-level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option value="">All levels</option>
                {levels.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </div>
            {pool.length < 4 && (
              <p className="inline-message">
                This level needs at least four words. Choose all levels or ask
                your school to add more.
              </p>
            )}
            <button
              className="button primary"
              disabled={pool.length < 4}
              onClick={start}
            >
              Start quiz
              <ArrowRight size={14} />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="game-progress">
            <span>
              Word {index + 1} of {questions.length}
            </span>
            <span>{score} discovered</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(index / questions.length) * 100}%` }}
            />
          </div>
          <section className="question-card">
            <p className="eyebrow">Choose the meaning</p>
            <div className="quiz-word">{question.word.word}</div>
            <p className="phonetic">
              {question.word.phonetic} · {question.word.part}
            </p>
            <div className="options">
              {question.options.map((option, i) => (
                <button
                  className={`option ${selected === option.id ? "selected" : ""} ${checked && option.id === question.word.id ? "correct" : ""} ${checked && selected === option.id && option.id !== question.word.id ? "incorrect" : ""}`}
                  key={option.id}
                  aria-pressed={selected === option.id}
                  disabled={checked}
                  onClick={() => setSelected(option.id)}
                >
                  <span className="option-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {option.definition}
                </button>
              ))}
            </div>
            {checked && (
              <p
                className={`feedback ${selected === question.word.id ? "" : "incorrect"}`}
                role="status"
              >
                <strong>
                  {selected === question.word.id ? "Correct. " : "Incorrect. "}
                </strong>
                {question.word.example}
              </p>
            )}
            <div className="game-controls">
              {checked ? (
                <button className="button primary" onClick={next}>
                  {index === questions.length - 1 ? "View result" : "Next word"}
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  className="button primary"
                  disabled={!selected}
                  onClick={() => {
                    setChecked(true);
                    if (selected === question.word.id) setScore(score + 1);
                  }}
                >
                  Check meaning
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
