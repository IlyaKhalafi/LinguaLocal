"use client";
import type { ReactNode, Ref } from "react";
import { useLocale } from "./locale-provider";

export function AnswerFeedback({
  correct,
  children,
  ref,
}: {
  correct: boolean;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}) {
  const { t } = useLocale();
  return (
    <div
      className={`feedback answer-feedback ${correct ? "" : "incorrect"}`}
      role="status"
      ref={ref}
      tabIndex={ref ? -1 : undefined}
    >
      <strong>{t(correct ? "Correct. " : "Incorrect. ")}</strong>
      <div className="feedback-content" lang="en" dir="ltr">
        {children}
      </div>
    </div>
  );
}
