"use client";
import { useMemo } from "react";
import type { ContentPack } from "@/lib/schema";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { encodeAssignment } from "@/lib/assignments";
import { useProgress } from "./progress-provider";
import { useLocale } from "./locale-provider";

export function AssignmentList({ content }: { content: ContentPack }) {
  const { progress, removeAssignment } = useProgress();
  const { t } = useLocale();
  const available = useMemo(
    () =>
      new Set([
        ...content.lessons.map((item) => `lesson/${item.id}`),
        ...content.books.map((item) => `book/${item.id}`),
        ...content.words.map((item) => `word/${item.id}`),
      ]),
    [content],
  );
  const assignments = Object.entries(progress.assignments);
  if (!assignments.length) return null;
  return (
    <details className="completed-lessons assignment-history">
      <summary>{t("My assignments")}</summary>
      <ul className="assignment-tasks">
        {assignments.map(([id, checklist]) => {
          const plan = {
            version: 1,
            title: checklist.title,
            due: checklist.due,
            tasks: checklist.tasks.map((key) => {
              const [kind, id] = key.split("/");
              return { kind, id };
            }),
          };
          return (
            <li key={id}>
              <div>
                <Link
                  href={`/assignment?plan=${encodeURIComponent(encodeAssignment(plan))}`}
                >
                  <bdi>{checklist.title}</bdi>
                </Link>
                <p>
                  {t("{done} of {count} complete", {
                    done: checklist.checked.length,
                    count: checklist.tasks.filter(
                      (key) =>
                        available.has(key) || checklist.checked.includes(key),
                    ).length,
                  })}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={t("Remove checklist for {title}", {
                  title: checklist.title,
                })}
                onClick={(event) => {
                  if (
                    !window.confirm(
                      t(
                        "Remove this checklist? Your lessons and reviews stay saved.",
                      ),
                    )
                  )
                    return;
                  const parent = event.currentTarget.closest("details");
                  removeAssignment(id);
                  requestAnimationFrame(() => {
                    const fallback = parent?.isConnected
                      ? parent.querySelector("summary")
                      : document.querySelector<HTMLElement>("main h1");
                    if (fallback) {
                      if (fallback.tagName === "H1")
                        fallback.setAttribute("tabindex", "-1");
                      fallback.focus({ preventScroll: true });
                    }
                  });
                }}
              >
                <Trash2 size={16} />
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
