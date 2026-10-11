"use client";
import { SearchField } from "./search-field";
import { useLocale } from "@/components/locale-provider";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { createSearchIndex, searchIndex } from "@/lib/search";
import { levels, lessonCategories, type Lesson } from "@/lib/schema";
import { useListQuery } from "@/lib/use-list-query";
import { useFocusOnChange } from "@/lib/use-focus-on-change";
import { Pagination } from "./pagination";
import { useProgress } from "./progress-provider";
import { Badge, EmptyState, PageHeading } from "./ui";

export function Lessons({ lessons }: { lessons: Lesson[] }) {
  const { t } = useLocale();
  const {
    search: query,
    category,
    level,
    page,
    update,
  } = useListQuery(lessonCategories);
  const [focusRequest, setFocusRequest] = useState(0);
  const resultsRef = useFocusOnChange(focusRequest, false);
  const { progress } = useProgress();
  const search = useDeferredValue(query);
  const index = useMemo(
    () =>
      createSearchIndex(
        lessons,
        (lesson) => `${lesson.title} ${lesson.description} ${lesson.category}`,
      ),
    [lessons],
  );
  const filtered = useMemo(
    () =>
      searchIndex(
        index,
        search,
        (lesson) =>
          (!category || lesson.category === category) &&
          (!level || lesson.level === level),
      ),
    [index, search, category, level],
  );
  const pageSize = 6;
  const pages = Math.ceil(filtered.length / pageSize);
  const currentPage = Math.max(0, Math.min(page, pages - 1));
  return (
    <>
      <PageHeading title={t("Lessons")} />
      <div className="toolbar">
        <SearchField
          label={t("Search lessons")}
          placeholder={t("Search lessons")}
          value={query}
          onChange={(search) => update({ search, page: 0 }, "replace")}
        />
        <select
          aria-label={t("Filter lessons by level")}
          value={level}
          onChange={(e) => update({ level: e.target.value, page: 0 })}
        >
          <option value="">{t("All levels")}</option>
          {levels.map((level) => (
            <option key={level}>{level}</option>
          ))}
        </select>
        <select
          aria-label={t("Filter lessons by subject")}
          value={category}
          onChange={(event) =>
            update({ category: event.target.value, page: 0 })
          }
        >
          <option value="">{t("All subjects")}</option>
          {lessonCategories.map((category) => (
            <option key={category} value={category}>
              {t(category)}
            </option>
          ))}
        </select>
      </div>
      <p
        className="result-caption"
        ref={resultsRef}
        tabIndex={-1}
        role="status"
      >
        {t("{count} lessons", { count: filtered.length })}
      </p>
      {filtered.length ? (
        <div className="lesson-grid">
          {filtered
            .slice(currentPage * pageSize, (currentPage + 1) * pageSize)
            .map((lesson) => (
              <Link
                href={`/lessons/${lesson.id}`}
                className="lesson-card"
                key={lesson.id}
                aria-labelledby={`lesson-title-${lesson.id}`}
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
                <h2 id={`lesson-title-${lesson.id}`} lang="en" dir="ltr">
                  {lesson.title}
                </h2>
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
                      <ArrowRight size={14} aria-hidden="true" />
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
                update({ search: "", category: "", level: "", page: 0 });
              }}
            >
              {t("Clear filters")}
            </button>
          }
        />
      )}
      <Pagination
        page={currentPage}
        pages={pages}
        onChange={(page) => {
          update({ page }, "push");
          setFocusRequest((request) => request + 1);
        }}
      />
    </>
  );
}
