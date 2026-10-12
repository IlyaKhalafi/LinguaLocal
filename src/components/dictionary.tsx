"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { SearchField } from "./search-field";
import { useLocale } from "@/components/locale-provider";
import { useDeferredValue, useMemo, useState } from "react";
import { Bookmark } from "lucide-react";
import { levels, type Word } from "@/lib/schema";
import { useProgress } from "./progress-provider";
import { WordCard } from "./word-card";
import { EmptyState, PageHeading } from "./ui";
import { createSearchIndex, searchIndex } from "@/lib/search";
import { Pagination } from "./pagination";
import { useFocusOnChange } from "@/lib/use-focus-on-change";
import { useListQuery } from "@/lib/use-list-query";

const pageSize = 12;

export function Dictionary({
  words,
  focusSearch = false,
}: {
  words: Word[];
  focusSearch?: boolean;
}) {
  const { t } = useLocale();
  const wordId = useSearchParams().get("word");
  const { search: query, level, page, saved, update } = useListQuery();
  const [focusRequest, setFocusRequest] = useState(0);
  const [focusWord, setFocusWord] = useState<string | null>(null);
  const resultsRef = useFocusOnChange(focusRequest, false);
  const { progress } = useProgress();
  const savedIds = useMemo(() => new Set(progress.saved), [progress.saved]);
  const search = useDeferredValue(query);
  const index = useMemo(
    () =>
      createSearchIndex(
        words,
        (word) =>
          `${word.word} ${word.definition} ${word.example} ${word.synonyms.join(" ")}`,
      ),
    [words],
  );
  const filtered = useMemo(
    () =>
      searchIndex(
        index,
        search,
        (word) =>
          (!wordId || word.id === wordId) &&
          (!level || word.level === level) &&
          (!saved || savedIds.has(word.id)),
      ),
    [index, search, level, saved, savedIds, wordId],
  );
  const pages = Math.ceil(filtered.length / pageSize);
  const currentPage = Math.max(0, Math.min(page, pages - 1));
  function focusAfterRemoval(id: string) {
    const index = filtered.findIndex((word) => word.id === id);
    const remaining = filtered.filter((word) => word.id !== id);
    const lastPage = Math.max(0, Math.ceil(remaining.length / pageSize) - 1);
    if (page > lastPage) update({ page: lastPage }, "replace");
    const next = remaining[Math.min(index, remaining.length - 1)];
    setFocusWord(next?.id ?? null);
    setFocusRequest((request) => request + 1);
  }
  return (
    <>
      {wordId && (
        <Link className="back-link" href="/dictionary">
          <ArrowLeft size={14} />
          {t("All words")}
        </Link>
      )}
      <PageHeading title={t("Dictionary")} />
      <div className="toolbar">
        <SearchField
          autoFocus={focusSearch}
          label={t("Search dictionary")}
          placeholder={t("Search words or meanings")}
          value={query}
          onChange={(value) => {
            update({ search: value, page: 0 }, "replace");
            setFocusWord(null);
          }}
        />
        <select
          aria-label={t("Filter words by level")}
          value={level}
          onChange={(e) => {
            update({ level: e.target.value, page: 0 });
            setFocusWord(null);
          }}
        >
          <option value="">{t("All levels")}</option>
          {levels.map((level) => (
            <option key={level}>{level}</option>
          ))}
        </select>
        <button
          className={`button ${saved ? "primary" : "secondary"}`}
          aria-pressed={saved}
          onClick={() => {
            update({ saved: !saved, page: 0 });
            setFocusWord(null);
          }}
        >
          <Bookmark size={14} />
          {t("Saved words")}
        </button>
      </div>
      <p
        className="result-caption"
        aria-live="polite"
        tabIndex={-1}
        ref={focusWord ? undefined : resultsRef}
        aria-describedby={pages > 1 ? "dictionary-page-position" : undefined}
      >
        {t("{count} words", { count: filtered.length })}
      </p>
      {pages > 1 && (
        <span className="sr-only" id="dictionary-page-position">
          {t("Page {current} of {total}", {
            current: currentPage + 1,
            total: pages,
          })}
        </span>
      )}
      {filtered.length ? (
        <div className="dictionary-grid">
          {filtered
            .slice(currentPage * pageSize, (currentPage + 1) * pageSize)
            .map((word) => (
              <WordCard
                key={word.id}
                word={word}
                onSavedChange={
                  saved ? () => focusAfterRemoval(word.id) : undefined
                }
                saveButtonRef={focusWord === word.id ? resultsRef : undefined}
              />
            ))}
        </div>
      ) : (
        <EmptyState
          title={saved ? t("No saved words") : t("No matching words")}
          description={
            saved
              ? t("Save words using the bookmark button.")
              : t("Try a different search or clear the filters.")
          }
          action={
            <button
              className="button secondary"
              onClick={() => {
                update({ search: "", saved: false, level: "", page: 0 });
                setFocusWord(null);
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
        onChange={(value) => {
          update({ page: value }, "push");
          setFocusWord(null);
          setFocusRequest((request) => request + 1);
        }}
      />
    </>
  );
}
