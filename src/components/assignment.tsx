"use client";
import Link from "next/link";
import { ArrowLeft, Minus } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { Assignment, resolveAssignment } from "@/lib/assignments";
import { useToday } from "@/lib/use-today";
import { useLocale } from "./locale-provider";
import { useProgress } from "./progress-provider";
import { EmptyState, PageHeading } from "./ui";

const noChecks: readonly string[] = [];
type Props = {
  id?: string;
  assignment?: Assignment;
  tasks?: ReturnType<typeof resolveAssignment>;
};
export function AssignmentPage({ id, assignment, tasks }: Props) {
  const { t, locale } = useLocale();
  const { progress, setAssignmentTask } = useProgress();
  const today = useToday();
  const counter = useRef<HTMLHeadingElement>(null);
  const focused = useRef<HTMLInputElement | null>(null);
  const checked = id
    ? (progress.assignments[id]?.checked ?? noChecks)
    : noChecks;
  useLayoutEffect(() => {
    const active = focused.current;
    if (active && !active.isConnected) {
      focused.current = null;
      if (document.activeElement === document.body)
        counter.current?.focus({ preventScroll: true });
    }
  }, [checked]);
  const [message, setMessage] = useState("");
  if (!id || !assignment || !tasks)
    return (
      <>
        <PageHeading title={t("Assignment")} />
        <EmptyState
          title={t("This assignment link is unavailable")}
          description={t("Ask your school for an updated link.")}
          action={
            <Link className="button primary" href="/">
              {t("Home")}
            </Link>
          }
        />
      </>
    );
  const total = tasks.filter(
    (task) => task.available || checked.includes(task.key),
  ).length;
  const plan = {
    title: assignment.title,
    due: assignment.due,
    tasks: tasks.map((task) => task.key),
  };
  const due = assignment.due ? new Date(`${assignment.due}T12:00:00`) : null;
  return (
    <>
      <Link className="back-link" href="/">
        <ArrowLeft size={14} />
        {t("Home")}
      </Link>
      <PageHeading
        eyebrow={t("Assignment")}
        title={assignment.title}
        contentDirection="auto"
      />
      <section
        className="panel assignment-panel"
        aria-label={t("Assignment checklist")}
      >
        <div className="section-heading">
          <h2 ref={counter} tabIndex={-1}>
            {total
              ? t("{done} of {count} complete", {
                  done: checked.length,
                  count: total,
                })
              : t("No available tasks")}
          </h2>
          {due && (
            <time className="assignment-due" dateTime={assignment.due}>
              {t(
                today && assignment.due! < today
                  ? "Was due {date}"
                  : "Due {date}",
                {
                  date: new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                  }).format(due),
                },
              )}
            </time>
          )}
        </div>
        {!total && (
          <p className="muted">{t("Ask your school for an updated link.")}</p>
        )}
        {total > 0 && (
          <progress
            className="assignment-progress"
            max={Math.max(1, total)}
            value={checked.length}
            aria-label={t("Assignment progress")}
          />
        )}
        <ul className="assignment-tasks">
          {tasks.map((task) => (
            <li key={task.key}>
              {task.available || checked.includes(task.key) ? (
                <label className="assignment-check">
                  <input
                    type="checkbox"
                    aria-label={t("Complete {title}", { title: task.title })}
                    checked={checked.includes(task.key)}
                    onFocus={(event) => {
                      focused.current = event.currentTarget;
                    }}
                    onBlur={(event) => {
                      if (event.currentTarget.isConnected)
                        focused.current = null;
                    }}
                    onChange={(event) => {
                      if (!task.available && !checked.includes(task.key))
                        return;
                      setMessage(
                        setAssignmentTask(
                          id,
                          plan,
                          task.key,
                          event.target.checked,
                        )
                          ? ""
                          : "Assignment limit reached. Remove an older checklist from Progress.",
                      );
                    }}
                  />
                </label>
              ) : (
                <span className="assignment-check muted" aria-hidden="true">
                  <Minus size={16} />
                </span>
              )}
              <div>
                {task.available ? (
                  <Link href={task.href}>
                    <bdi>{task.title}</bdi>
                  </Link>
                ) : (
                  <bdi>{task.title}</bdi>
                )}
                <p>
                  {t(
                    !task.available
                      ? "No longer in this collection"
                      : task.kind === "lesson"
                        ? "Lesson"
                        : task.kind === "book"
                          ? "Book"
                          : "Word",
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className={message ? "inline-message" : "sr-only"} role="status">
          {t(message)}
        </p>
      </section>
    </>
  );
}
