"use client";
import { useLocale } from "@/components/locale-provider";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { distinctGameWords, makeQuiz } from "@/lib/learning";
import { useFocusOnChange } from "@/lib/use-focus-on-change";
import { levels, type Word } from "@/lib/schema";
import { useProgress } from "./progress-provider";
import { PageHeading } from "./ui";
import { AnswerFeedback } from "./answer-feedback";

export function Quiz({ words }: { words: Word[] }) {
  const { t } = useLocale();
  const [level, setLevel] = useState("");
  const [questions, setQuestions] = useState<ReturnType<typeof makeQuiz>>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [checked, setChecked] = useState(false);
  const { record } = useProgress();
  const pool = useMemo(
    () =>
      distinctGameWords(words.filter((word) => !level || word.level === level)),
    [words, level],
  );
  const focusTarget = useFocusOnChange(
    `${finished}-${questions.length}-${index}`,
  );
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
        {t("Games")}
      </Link>
      <PageHeading title={t("Vocabulary quiz")} />
      {finished ? (
        <div className="results-panel">
          <Sparkles size={35} color="#88a373" />
          <h2 ref={focusTarget} tabIndex={-1}>
            {t("Quiz complete")}
          </h2>
          <div className="results-score">
            {t("{count}", { count: score })}
            <span style={{ fontSize: 15, marginTop: -35 }}>
              {t("of {total}", { total: questions.length })}
            </span>
          </div>
          <p>
            {score === questions.length
              ? t("All answers correct.")
              : t("Review the missed words and try again.")}
          </p>
          <div className="button-row">
            <button className="button primary" onClick={start}>
              <RotateCcw size={14} />
              {t("Play again")}
            </button>
            <Link className="button secondary" href="/progress">
              {t("View progress")}
            </Link>
          </div>
        </div>
      ) : !question ? (
        <>
          <div className="panel">
            <div className="form-field">
              <label htmlFor="quiz-level">{t("Level")}</label>
              <select
                id="quiz-level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option value="">{t("All levels")}</option>
                {levels.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </div>
            {pool.length < 4 && (
              <p
                id="quiz-pool-help"
                className="inline-message game-pool-help"
                role="status"
              >
                {t("This selection needs four distinct words.")}
              </p>
            )}
            <button
              className="button primary"
              disabled={pool.length < 4}
              aria-describedby={pool.length < 4 ? "quiz-pool-help" : undefined}
              onClick={start}
            >
              {t("Start quiz")}
              <ArrowRight size={14} />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="game-progress">
            <span>
              {t("Word {current} of {total}", {
                current: index + 1,
                total: questions.length,
              })}
            </span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(index / questions.length) * 100}%` }}
            />
          </div>
          <section className="question-card">
            <p className="eyebrow">{t("Choose the meaning")}</p>
            <h2
              className="quiz-word"
              lang="en"
              dir="ltr"
              ref={focusTarget}
              tabIndex={-1}
            >
              {question.word.word}
            </h2>
            <p className="phonetic" lang="en" dir="ltr">
              {question.word.phonetic} · {question.word.part}
            </p>
            <div className="options">
              {question.options.map((option, i) => (
                <button
                  lang="en"
                  dir="ltr"
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
              <AnswerFeedback correct={selected === question.word.id}>
                {question.word.example}
              </AnswerFeedback>
            )}
            <div className="game-controls">
              {checked ? (
                <button className="button primary" onClick={next}>
                  {index === questions.length - 1
                    ? t("View result")
                    : t("Next word")}
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
                  {t("Check meaning")}
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
