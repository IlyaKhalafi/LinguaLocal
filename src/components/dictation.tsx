"use client";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import {
  compareDictation,
  dictationTextLimit,
  dictationWordLimit,
} from "@/lib/dictation";
import { plainSubtitle, type SubtitleCue } from "@/lib/subtitles";
import { useFocusOnChange } from "@/lib/use-focus-on-change";
import { AnswerFeedback } from "./answer-feedback";
import { useLocale } from "./locale-provider";
import { useProgress } from "./progress-provider";

export function Dictation({
  cues,
  play,
  stop,
  onClose,
}: {
  cues: SubtitleCue[];
  play: (start: number, end: number) => void;
  stop: () => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const { record } = useProgress();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);
  const submitLock = useRef(false);
  const saved = useRef(false);
  const checkedTotals = useRef({ score: 0, total: 0 });
  const recordRef = useRef(record);
  useEffect(() => {
    recordRef.current = record;
  }, [record]);
  useEffect(
    () => () => {
      if (!saved.current && checkedTotals.current.total > 0) {
        saved.current = true;
        recordRef.current({ title: "Dictation", ...checkedTotals.current });
      }
    },
    [],
  );
  const input = useRef<HTMLTextAreaElement>(null);
  const focus = useFocusOnChange(`${index}-${checked}-${finished}`);
  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    submitLock.current = false;
  }, [index, checked, finished]);
  const cue = cues[index];
  const reference = plainSubtitle(cue.text);
  const result = useMemo(() => {
    try {
      return compareDictation(reference, answer);
    } catch {
      return undefined;
    }
  }, [reference, answer]);
  function next() {
    stop();
    if (index === cues.length - 1) {
      record({ title: "Dictation", score, total });
      saved.current = true;
      setFinished(true);
    } else {
      const nextCue = cues[index + 1];
      setIndex(index + 1);
      setAnswer("");
      setChecked(false);
      setError(false);
      play(nextCue.start, nextCue.end);
    }
  }
  return (
    <div className="dictation">
      <div className="section-heading">
        <h4
          ref={finished ? focus : undefined}
          tabIndex={finished ? -1 : undefined}
        >
          {t(finished ? "Practice complete" : "Dictation")}
        </h4>
        {!finished && (
          <button className="text-link" onClick={onClose}>
            {t("Back to transcript")}
          </button>
        )}
      </div>
      {finished ? (
        <div className="dictation-result">
          <p>{t("{score} of {total} words", { score, total })}</p>
          <button className="button primary" onClick={onClose}>
            {t("Back to transcript")}
          </button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (submitLock.current || !answer.trim()) return;
            if (checked) {
              submitLock.current = true;
              next();
              return;
            }
            if (!result) {
              setError(true);
              return;
            }
            submitLock.current = true;
            stop();
            setScore(score + result.score);
            setTotal(total + result.total);
            checkedTotals.current = {
              score: score + result.score,
              total: total + result.total,
            };
            setChecked(true);
            setError(false);
          }}
        >
          <p className="game-progress">
            {t("Passage {current} of {total}", {
              current: index + 1,
              total: cues.length,
            })}
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={() => play(cue.start, cue.end)}
          >
            <Volume2 size={16} />
            {t("Listen")}
          </button>
          <div className="form-field">
            <label htmlFor="dictation-answer">
              {t(checked ? "Your answer" : "Type what you hear")}
            </label>
            <textarea
              id="dictation-answer"
              lang="en"
              dir="ltr"
              rows={3}
              ref={
                !checked
                  ? (node) => {
                      input.current = node;
                      focus(node);
                    }
                  : undefined
              }
              maxLength={dictationTextLimit}
              readOnly={checked}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={answer}
              onChange={(event) => {
                setAnswer(event.target.value);
                setError(false);
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  if (!event.repeat) event.currentTarget.form?.requestSubmit();
                }
              }}
            />
          </div>
          {error && (
            <p className="inline-message" role="status">
              {t("Use {count} words or fewer.", { count: dictationWordLimit })}
            </p>
          )}
          {checked && result && (
            <AnswerFeedback
              correct={result.correct}
              after={
                <>
                  {result.words.some((word) => !word.correct) && (
                    <p className="dictation-legend">
                      {t("Highlighted words need practice.")}
                    </p>
                  )}
                  {result.extra.length > 0 && (
                    <p className="dictation-legend">
                      {t("Extra words")}{" "}
                      <bdi lang="en" dir="ltr">
                        {result.extra.join(" ")}
                      </bdi>
                    </p>
                  )}
                </>
              }
            >
              <p className="dictation-reference">
                {result.words.map((word, position) => (
                  <Fragment key={word.start}>
                    {reference.slice(
                      position ? result.words[position - 1].end : 0,
                      word.start,
                    )}
                    {word.correct ? word.text : <mark>{word.text}</mark>}
                  </Fragment>
                ))}
                {reference.slice(result.words.at(-1)!.end)}
              </p>
            </AnswerFeedback>
          )}
          <button
            className="button primary"
            ref={checked ? focus : undefined}
            disabled={!answer.trim()}
            type="submit"
          >
            {t(
              checked
                ? index === cues.length - 1
                  ? "View result"
                  : "Next passage"
                : "Check answer",
            )}
          </button>
        </form>
      )}
    </div>
  );
}
