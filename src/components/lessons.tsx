"use client";
import { useLocale } from "@/components/locale-provider";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Clock, Search } from "lucide-react";
import { levels, type Lesson } from "@/lib/schema";
import { useProgress } from "./progress-provider";
import { Badge, EmptyState, PageHeading } from "./ui";

export function Lessons({ lessons }: { lessons: Lesson[] }) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const { progress } = useProgress();
  const filtered = lessons.filter(
    (lesson) =>
      `${lesson.title} ${lesson.description}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!category || lesson.category === category) &&
      (!level || lesson.level === level),
  );
  return (
    <>
      <PageHeading title={t("Lessons")} />
      <div className="toolbar">
        <label className="search-field">
          <Search size={16} />
          <span className="sr-only">{t("Search lessons")}</span>
          <input
            dir="auto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search lessons")}
          />
        </label>
        <select
          aria-label={t("Filter lessons by level")}
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="">{t("All levels")}</option>
          {levels.map((level) => (
            <option key={level}>{level}</option>
          ))}
        </select>
      </div>
      <div className="tabs" style={{ marginBottom: 23 }}>
        {["", "Grammar", "Vocabulary", "Reading", "Speaking"].map((item) => (
          <button
            className={`tab ${category === item ? "active" : ""}`}
            aria-pressed={category === item}
            key={item}
            onClick={() => setCategory(item)}
          >
            {t(item || "All lessons")}
          </button>
        ))}
      </div>
      {filtered.length ? (
        <div className="lesson-grid">
          {filtered.map((lesson) => (
            <Link
              href={`/lessons/${lesson.id}`}
              className="lesson-card"
              key={lesson.id}
            >
              <div className="lesson-card-top">
                <Badge
                  tone={
                    lesson.category === "Grammar"
                      ? "peach"
                      : lesson.category === "Reading"
                        ? "purple"
                        : "green"
                  }
                >
                  {t(lesson.category)}
                </Badge>
                <Badge>{lesson.level}</Badge>
              </div>
              <h3 lang="en" dir="ltr">
                {lesson.title}
              </h3>
              <p lang="en" dir="ltr">
                {lesson.description}
              </p>
              <div className="lesson-card-bottom">
                <span>
                  <Clock size={13} />
                  {t("{count} min read", { count: lesson.minutes })}
                </span>
                {progress.completed.includes(lesson.id) ? (
                  <span>
                    <CheckCircle2 size={14} />
                    {t("Completed")}
                  </span>
                ) : (
                  <span>
                    {t("Open lesson")}
                    <ArrowRight size={14} />
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("No matching lessons")}
          description={t("Try a different search or clear the filters.")}
          action={
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setCategory("");
                setLevel("");
              }}
            >
              {t("Clear filters")}
            </button>
          }
        />
      )}
    </>
  );
}
