"use client";
import { useLocale } from "@/components/locale-provider";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Printer } from "lucide-react";
import type { Lesson } from "@/lib/schema";
import { useFocusOnChange } from "@/lib/use-focus-on-change";
import { useProgress } from "./progress-provider";
import { Badge, PageHeading } from "./ui";

export function LessonDetail({ lesson }: { lesson: Lesson }) {
  const { t } = useLocale();
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const { progress, complete } = useProgress();
  const done = progress.completed.includes(lesson.id);
  const retryTarget = useFocusOnChange(checked);
  const completedTarget = useFocusOnChange(done);
  return (
    <article className="lesson-content">
      <Link className="back-link" href="/lessons">
        <ArrowLeft size={14} />
        {t("All lessons")}
      </Link>
      <PageHeading
        contentLanguage="en"
        eyebrow={`${t(lesson.category)} · ${lesson.level} · ${t("{count} min read", { count: lesson.minutes })}`}
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
          <p
            className={`feedback ${selected === lesson.answer ? "" : "incorrect"}`}
            role="status"
          >
            <strong>
              {selected === lesson.answer ? t("Correct. ") : t("Incorrect. ")}
            </strong>
            <bdi lang="en" dir="ltr">
              {lesson.explanation}
            </bdi>
          </p>
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
              className="button primary"
              disabled={selected === null}
              onClick={() => setChecked(true)}
            >
              {t("Check answer")}
            </button>
          )}
        </div>
      </section>
      <div
        className="completion"
        ref={completedTarget}
        tabIndex={-1}
        role="group"
        aria-label={done ? t("Completed") : t("Practice")}
      >
        <button className="button secondary" onClick={() => window.print()}>
          <Printer size={14} />
          {t("Print lesson")}
        </button>
        <button
          className={`button ${done ? "soft-button" : "primary"}`}
          disabled={done || !checked}
          aria-describedby={
            !done && !checked ? "lesson-complete-help" : undefined
          }
          onClick={() => complete(lesson.id)}
        >
          <CheckCircle2 size={15} />
          {done ? t("Completed") : t("Mark as complete")}
        </button>
      </div>
      {!done && !checked && (
        <p
          id="lesson-complete-help"
          className="muted"
          style={{ marginTop: 12, fontSize: 12 }}
        >
          {t("Check your answer before marking this lesson complete.")}
        </p>
      )}
    </article>
  );
}
