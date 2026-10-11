"use client";
import { useLocale } from "@/components/locale-provider";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useProgress } from "./progress-provider";
import { BookCard, PageHeading } from "./ui";
import { WordCard } from "./word-card";
import { NumberRatio } from "./number-ratio";
import { dailyWord } from "@/lib/learning";
import { useToday } from "@/lib/use-today";
import { defaultSettings } from "@/lib/default-settings";
import type { ContentPack, Settings } from "@/lib/schema";

export function Overview({
  content,
  settings,
  serverDay,
}: {
  content: ContentPack;
  settings: Settings;
  serverDay: string;
}) {
  const { t } = useLocale();
  const { progress } = useProgress();
  const day = useToday(serverDay);
  const date = new Date(`${day}T12:00:00`);
  const today = progress.activity[day] ?? 0;
  const word = dailyWord(content.words, date);
  return (
    <>
      <PageHeading
        title={t("Home")}
        action={
          <Link className="button primary" href="/flashcards">
            {t("Review words")}
            <ArrowRight size={14} />
          </Link>
        }
      />
      {settings.welcome !== defaultSettings.welcome && (
        <p className="school-welcome">{settings.welcome}</p>
      )}
      <div className="dashboard-columns">
        <section>
          <div className="section-heading">
            <h2>{t("Books")}</h2>
            <Link className="text-link" href="/library">
              {t("View all")}
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="book-grid">
            {content.books.slice(0, 3).map((book) => (
              <BookCard headingLevel={3} book={book} key={book.id} />
            ))}
          </div>
          {!content.books.length && (
            <p className="muted">{t("No books available.")}</p>
          )}
        </section>
        <div className="dashboard-aside">
          <div className="panel goal-panel">
            <h2>{t("Daily goal")}</h2>
            <div
              className="goal-circle"
              style={
                {
                  "--percent": `${Math.min(100, (today / progress.goal) * 100)}%`,
                } as React.CSSProperties
              }
            >
              <div>
                <NumberRatio current={today} total={progress.goal} />
                <small>{t("Activities today")}</small>
              </div>
            </div>
            <Link className="text-link" href="/progress">
              {t("View progress")}
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="daily-word-panel">
            <h2 className="section-title">{t("Word of the day")}</h2>
            <WordCard featured word={word} />
          </div>
        </div>
      </div>
    </>
  );
}
