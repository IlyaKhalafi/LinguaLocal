"use client";
import { useLocale } from "@/components/locale-provider";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Printer } from "lucide-react";
import type { Lesson } from "@/lib/schema";
import type { LessonSummary } from "@/lib/lesson-study";
import { useFocusOnChange } from "@/lib/use-focus-on-change";
import { useProgress } from "./progress-provider";
import { Badge, PageHeading } from "./ui";
import { AnswerFeedback } from "./answer-feedback";

export function LessonDetail({
  lesson,
  next,
}: {
  lesson: Lesson;
  next?: LessonSummary;
}) {
  const { t } = useLocale();
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [completionRequest, setCompletionRequest] = useState(0);
  const { progress, complete } = useProgress();
  const done = progress.completed.includes(lesson.id);
  const retryTarget = useFocusOnChange(checked);
  const completedTarget = useFocusOnChange(completionRequest);
  return (
    <article className="lesson-content">
      <div className="lesson-navigation no-print">
        <Link className="back-link" href="/lessons">
          <ArrowLeft size={14} />
          {t("All lessons")}
        </Link>
        <button
          className="icon-button"
          aria-label={t("Print lesson")}
          title={t("Print lesson")}
          onClick={() => window.print()}
        >
          <Printer size={17} aria-hidden="true" />
        </button>
      </div>
      <PageHeading
        contentLanguage="en"
        eyebrow={
          <span className="lesson-metadata">
            <bdi>{t(lesson.category)}</bdi>
            <span aria-hidden="true">·</span>
            <bdi dir="ltr">{lesson.level}</bdi>
            <span aria-hidden="true">·</span>
            <bdi>{t("{count} min read", { count: lesson.minutes })}</bdi>
          </span>
        }
        title={lesson.title}
        description={lesson.description}
      />
      {lesson.sections.map((section, index) => (
        <section lang="en" dir="ltr" className="lesson-section" key={index}>
          <h2>{section.title}</h2>
          <p>{section.body}</p>
        </section>
      ))}
      <section className="exercise">
        <Badge tone="green">{t("Practice")}</Badge>
        <h3 lang="en" dir="ltr">
          {lesson.question}
        </h3>
        <div className="options">
          {lesson.options.map((option, index) => (
            <button
              ref={index === 0 && !checked ? retryTarget : undefined}
              key={index}
              lang="en"
              dir="ltr"
              className={`option ${selected === index ? "selected" : ""} ${checked && index === lesson.answer ? "correct" : ""} ${checked && selected === index && index !== lesson.answer ? "incorrect" : ""}`}
              aria-pressed={selected === index}
              disabled={checked}
              onClick={() => setSelected(index)}
            >
              <span className="option-letter">
                {String.fromCharCode(65 + index)}
              </span>
              {option}
            </button>
          ))}
        </div>
        {checked && (
          <AnswerFeedback
            correct={selected === lesson.answer}
            ref={retryTarget}
          >
            {lesson.explanation}
          </AnswerFeedback>
        )}
        <div className="game-controls">
          {checked ? (
            <button
              className="button secondary"
              onClick={() => {
                setChecked(false);
                setSelected(null);
              }}
            >
              {t("Try again")}
            </button>
          ) : (
            <button
              className={`button ${done ? "secondary" : "primary"}`}
              disabled={selected === null}
              onClick={() => setChecked(true)}
            >
              {t("Check answer")}
            </button>
          )}
        </div>
      </section>
      {(checked || done) && (
        <div className="completion lesson-completion no-print">
          {done ? (
            <>
              <span
                className="lesson-completed"
                role="status"
                aria-label={t("Completed")}
              >
                <CheckCircle2 size={16} aria-hidden="true" />
                {t("Completed")}
              </span>
              <div className="lesson-next-actions">
                {lesson.wordIds?.length ? (
                  <>
                    <Link
                      className="button primary"
                      ref={completedTarget}
                      href={`/flashcards?lesson=${lesson.id}`}
                    >
                      {t("Review lesson words")}
                      <ArrowRight size={14} />
                    </Link>
                    {next && (
                      <Link className="text-link" href={`/lessons/${next.id}`}>
                        {t("Next lesson")}
                        <ArrowRight size={14} />
                      </Link>
                    )}
                  </>
                ) : (
                  <Link
                    className="button primary"
                    ref={completedTarget}
                    href={next ? `/lessons/${next.id}` : "/lessons"}
                  >
                    {t(next ? "Next lesson" : "All lessons")}
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </>
          ) : (
            <button
              className="button primary"
              onClick={() => {
                complete(lesson.id);
                setCompletionRequest((request) => request + 1);
              }}
            >
              <CheckCircle2 size={15} />
              {t("Mark as complete")}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
