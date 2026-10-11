"use client";
import { useLocale } from "@/components/locale-provider";

import Link from "next/link";
import {
  BookOpen,
  Flame,
  GraduationCap,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useProgress } from "./progress-provider";
import { BookCard, PageHeading } from "./ui";
import { WordCard } from "./word-card";
import { dailyWord, streak } from "@/lib/learning";
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
  const stats = [
    { icon: BookOpen, value: content.books.length, label: "Books" },
    {
      icon: GraduationCap,
      value: content.lessons.filter((lesson) =>
        progress.completed.includes(lesson.id),
      ).length,
      label: "Completed lessons",
    },
    {
      icon: Layers,
      value: content.words.filter((word) => progress.saved.includes(word.id))
        .length,
      label: "Saved words",
    },
    {
      icon: Flame,
      value: streak(progress.activity, date),
      label: "Day streak",
    },
  ];
  return (
    <>
      <PageHeading title={t("Home")} />
      {settings.welcome !== defaultSettings.welcome && (
        <p className="school-welcome">{settings.welcome}</p>
      )}
      <div className="stat-grid">
        {stats.map(({ icon: Icon, value, label }) => (
          <div className="stat-card" key={label}>
            <span className="stat-icon">
              <Icon size={19} />
            </span>
            <div>
              <div className="stat-value">{t("{count}", { count: value })}</div>
              <div className="stat-label">{t(label)}</div>
            </div>
          </div>
        ))}
      </div>
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
              <BookCard book={book} key={book.id} />
            ))}
          </div>
          {!content.books.length && (
            <p className="muted">{t("No books available.")}</p>
          )}
          <div className="home-shortcuts">
            <Link className="button secondary" href="/lessons">
              {t("Lessons")}
              <ArrowRight size={14} />
            </Link>
            <Link className="button secondary" href="/games">
              {t("Games")}
              <ArrowRight size={14} />
            </Link>
            <Link className="button primary" href="/flashcards">
              {t("Review words")}
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
        <aside className="dashboard-aside">
          <div className="daily-word-panel">
            <h2 className="section-title">{t("Word of the day")}</h2>
            <WordCard featured word={word} />
          </div>
          <div className="panel goal-panel">
            <h3>{t("Daily goal")}</h3>
            <div
              className="goal-circle"
              style={
                {
                  "--percent": `${Math.min(100, (today / progress.goal) * 100)}%`,
                } as React.CSSProperties
              }
            >
              <div>
                <strong dir="ltr">
                  {t("{current} / {total}", {
                    current: today,
                    total: progress.goal,
                  })}
                </strong>
                <small>{t("Activities today")}</small>
              </div>
            </div>
            <Link className="text-link" href="/progress">
              {t("View progress")}
              <ArrowRight size={14} />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
