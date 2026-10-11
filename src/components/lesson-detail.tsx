"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Printer } from "lucide-react";
import type { Lesson } from "@/lib/schema";
import { useProgress } from "./progress-provider";
import { Badge, PageHeading } from "./ui";

export function LessonDetail({ lesson }: { lesson: Lesson }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const { progress, complete } = useProgress();
  const done = progress.completed.includes(lesson.id);
  return (
    <article className="lesson-content">
      <Link className="back-link" href="/lessons">
        <ArrowLeft size={14} />
        All lessons
      </Link>
      <PageHeading
        eyebrow={`${lesson.category.toUpperCase()} · ${lesson.level} · ${lesson.minutes} MIN READ`}
        title={lesson.title}
        description={lesson.description}
      />
      {lesson.sections.map((section, index) => (
        <section className="lesson-section" key={index}>
          <p className="eyebrow">
            SECTION {String(index + 1).padStart(2, "0")}
          </p>
          <h2>{section.title}</h2>
          <p>{section.body}</p>
        </section>
      ))}
      <section className="exercise">
        <Badge tone="green">Put it into practice</Badge>
        <h3>{lesson.question}</h3>
        <div className="options">
          {lesson.options.map((option, index) => (
            <button
              key={index}
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
              {selected === lesson.answer
                ? "You’ve got it! "
                : "A good opportunity to learn. "}
            </strong>
            {lesson.explanation}
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
              Try the question again
            </button>
          ) : (
            <button
              className="button primary"
              disabled={selected === null}
              onClick={() => setChecked(true)}
            >
              Check your answer
            </button>
          )}
        </div>
      </section>
      <div className="completion">
        <button className="button secondary" onClick={() => window.print()}>
          <Printer size={14} />
          Print lesson
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
          {done ? "Lesson completed" : "Mark as complete"}
        </button>
      </div>
      {!done && !checked && (
        <p
          id="lesson-complete-help"
          className="muted"
          style={{ marginTop: 12, fontSize: 12 }}
        >
          Check your practice answer to mark this lesson complete.
        </p>
      )}
    </article>
  );
}
