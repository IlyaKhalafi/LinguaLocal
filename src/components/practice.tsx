"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Volume2 } from "lucide-react";
import { levels, type Word } from "@/lib/schema";
import { shuffle } from "@/lib/learning";
import {
  gapSentence,
  matchesAnswer,
  practiceModes,
  type PracticeMode,
} from "@/lib/practice";
import { localEnglishVoice } from "@/lib/pronunciation";
import { useFocusOnChange } from "@/lib/use-focus-on-change";
import { useLocale } from "./locale-provider";
import { useProgress } from "./progress-provider";
import { EmptyState, PageHeading } from "./ui";

const names = {
  spelling: "Spelling",
  listening: "Listening practice",
  gap: "Gap fill",
} as const;
export function Practice({ words }: { words: Word[] }) {
  const { t } = useLocale();
  const { progress, record } = useProgress();
  const [mode, setMode] = useState<PracticeMode>("spelling");
  const [level, setLevel] = useState("");
  const [saved, setSaved] = useState(false);
  const [questions, setQuestions] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const mounted = useRef(true);
  const speechRequest = useRef(0);
  const submitLock = useRef(false);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    submitLock.current = false;
  }, [index, checked, finished]);
  const focus = useFocusOnChange(
    `${questions.length}-${index}-${checked}-${finished}`,
  );
  useEffect(() => {
    mounted.current = true;
    const requestCounter = speechRequest;
    const timer = speechTimer;
    return () => {
      mounted.current = false;
      requestCounter.current++;
      if (timer.current) clearTimeout(timer.current);
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    };
  }, []);
  const pool = words.filter(
    (word) =>
      (!level || word.level === level) &&
      (!saved || progress.saved.includes(word.id)) &&
      (mode !== "gap" || gapSentence(word)),
  );
  const word = questions[index];
  const correct = word && matchesAnswer(answer, word.word);
  async function listen() {
    if (!word || speaking) return;
    const request = ++speechRequest.current;
    if (!("speechSynthesis" in window)) {
      setSpeechError("Local pronunciation is unavailable in this browser.");
      return;
    }
    setSpeaking(true);
    try {
      const voice = await localEnglishVoice();
      if (!mounted.current || request !== speechRequest.current) return;
      if (!voice) {
        setSpeaking(false);
        setSpeechError(
          "Install an English voice on this device to use listening practice.",
        );
        return;
      }
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.85;
      utterance.onend = () => {
        if (mounted.current && request === speechRequest.current) {
          if (speechTimer.current) clearTimeout(speechTimer.current);
          setSpeaking(false);
        }
      };
      utterance.onerror = () => {
        if (mounted.current && request === speechRequest.current) {
          if (speechTimer.current) clearTimeout(speechTimer.current);
          setSpeaking(false);
          setSpeechError("Local pronunciation is unavailable in this browser.");
        }
      };
      setSpeechError("");
      if (speechTimer.current) clearTimeout(speechTimer.current);
      speechTimer.current = setTimeout(() => {
        if (mounted.current && request === speechRequest.current) {
          speechRequest.current++;
          speechSynthesis.cancel();
          setSpeaking(false);
          setSpeechError("Local pronunciation is unavailable in this browser.");
        }
      }, 10000);
      speechSynthesis.speak(utterance);
    } catch {
      if (mounted.current && request === speechRequest.current) {
        setSpeaking(false);
        setSpeechError("Local pronunciation is unavailable in this browser.");
      }
    }
  }
  function start() {
    setQuestions(shuffle(pool).slice(0, 8));
    setIndex(0);
    setScore(0);
    setAnswer("");
    setChecked(false);
    setFinished(false);
    setSpeechError("");
  }
  function stopSpeech() {
    speechRequest.current++;
    if (speechTimer.current) clearTimeout(speechTimer.current);
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    setSpeaking(false);
  }
  function next() {
    stopSpeech();
    if (index === questions.length - 1) {
      record({ title: names[mode], score, total: questions.length });
      setFinished(true);
    } else {
      setIndex(index + 1);
      setAnswer("");
      setChecked(false);
      setSpeechError("");
    }
  }
  return (
    <div className="game-panel">
      <Link className="back-link" href="/games">
        <ArrowLeft size={14} />
        {t("Games")}
      </Link>
      <PageHeading title={t("Practice")} />
      {finished ? (
        <div className="results-panel">
          <h2 ref={focus} tabIndex={-1}>
            {t("Practice complete")}
          </h2>
          <div className="results-score">
            {t("{count}", { count: score })}
            <span style={{ fontSize: 15, marginTop: -35 }}>
              {t("of {total}", { total: questions.length })}
            </span>
          </div>
          <div className="button-row">
            <button
              className="button primary"
              onClick={() => {
                setQuestions([]);
                setFinished(false);
              }}
            >
              {t("Practise again")}
            </button>
            <Link className="button secondary" href="/progress">
              {t("View progress")}
            </Link>
          </div>
        </div>
      ) : !word ? (
        <div className="panel">
          <div className="form-field">
            <label htmlFor="practice-mode">{t("Practice type")}</label>
            <select
              ref={focus}
              id="practice-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as PracticeMode)}
            >
              {practiceModes.map((value) => (
                <option key={value} value={value}>
                  {t(names[value])}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="practice-level">{t("Level")}</label>
            <select
              id="practice-level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="">{t("All levels")}</option>
              {levels.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
          <label className="practice-saved">
            <input
              type="checkbox"
              checked={saved}
              onChange={(e) => setSaved(e.target.checked)}
            />
            {t("Saved words")}
          </label>
          {pool.length ? (
            <button className="button primary" onClick={start}>
              {t("Start practice")}
            </button>
          ) : (
            <EmptyState
              title={t("No words available")}
              action={
                <Link className="text-link" href="/dictionary">
                  {t("Open dictionary")}
                </Link>
              }
            />
          )}
        </div>
      ) : (
        <>
          <div className="game-progress">
            {t("Word {current} of {total}", {
              current: index + 1,
              total: questions.length,
            })}
          </div>
          <form
            className="question-card"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.repeat) e.preventDefault();
            }}
            onSubmit={(e) => {
              e.preventDefault();
              if (submitLock.current || (!checked && !answer.trim())) return;
              submitLock.current = true;
              if (checked) next();
              else if (answer.trim()) {
                setChecked(true);
                if (correct) setScore(score + 1);
              }
            }}
          >
            <p className="eyebrow">
              {t(
                mode === "gap"
                  ? "Complete the sentence"
                  : mode === "listening"
                    ? "Listen and type the word"
                    : "Type the word for this meaning",
              )}
            </p>
            {mode === "listening" ? (
              <button
                className="button secondary practice-listen"
                type="button"
                onClick={() => void listen()}
                aria-disabled={speaking}
              >
                <Volume2 size={18} />
                {t(speaking ? "Playing" : "Listen")}
              </button>
            ) : (
              <h2 lang="en" dir="ltr" className="practice-prompt">
                {mode === "gap"
                  ? gapSentence(word)
                  : (gapSentence({
                      word: word.word,
                      example: word.definition,
                    }) ?? word.definition)}
              </h2>
            )}
            {speechError && (
              <p className="inline-message" role="status">
                {t(speechError)}
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    stopSpeech();
                    setQuestions([]);
                    setSpeechError("");
                  }}
                >
                  {t("Choose another practice")}
                </button>
              </p>
            )}
            <div className="form-field">
              <label htmlFor="practice-answer">{t("Your answer")}</label>
              <input
                ref={!checked ? focus : undefined}
                id="practice-answer"
                lang="en"
                dir="ltr"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={answer}
                readOnly={checked}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </div>
            {checked && (
              <div
                className={`feedback ${correct ? "" : "incorrect"}`}
                role="status"
              >
                <strong>{t(correct ? "Correct. " : "Incorrect. ")}</strong>
                <span lang="en" dir="ltr">
                  {word.word}
                </span>
                <p lang="en" dir="ltr">
                  {word.example}
                </p>
              </div>
            )}
            <div className="game-controls">
              <button
                ref={checked ? focus : undefined}
                className="button primary"
                disabled={!answer.trim()}
                type="submit"
              >
                {t(
                  checked
                    ? index === questions.length - 1
                      ? "View result"
                      : "Next word"
                    : "Check answer",
                )}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
