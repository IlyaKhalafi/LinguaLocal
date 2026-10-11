"use client";
import { SearchField } from "./search-field";
import { useLocale } from "@/components/locale-provider";
import { useMemo, useState } from "react";
import { Bookmark } from "lucide-react";
import { levels, type Word } from "@/lib/schema";
import { useProgress } from "./progress-provider";
import { WordCard } from "./word-card";
import { EmptyState, PageHeading } from "./ui";
import { Pagination } from "./pagination";
import { useFocusOnChange } from "@/lib/use-focus-on-change";

const pageSize = 12;

export function Dictionary({
  words,
  focusSearch = false,
}: {
  words: Word[];
  focusSearch?: boolean;
}) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [page, setPage] = useState(0);
  const [focusRequest, setFocusRequest] = useState(0);
  const [focusWord, setFocusWord] = useState<string | null>(null);
  const resultsRef = useFocusOnChange(focusRequest, false);
  const [saved, setSaved] = useState(false);
  const { progress } = useProgress();
  const filtered = useMemo(
    () =>
      words.filter(
        (word) =>
          `${word.word} ${word.definition} ${word.synonyms.join(" ")}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()) &&
          (!level || word.level === level) &&
          (!saved || progress.saved.includes(word.id)),
      ),
    [words, query, level, saved, progress.saved],
  );
  const pages = Math.ceil(filtered.length / pageSize);
  const currentPage = Math.max(0, Math.min(page, pages - 1));
  if (page !== currentPage) setPage(currentPage);
  function focusAfterRemoval(id: string) {
    const index = filtered.findIndex((word) => word.id === id);
    const remaining = filtered.filter((word) => word.id !== id);
    const next = remaining[Math.min(index, remaining.length - 1)];
    setFocusWord(next?.id ?? null);
    setFocusRequest((request) => request + 1);
  }
  return (
    <>
      <PageHeading title={t("Dictionary")} />
      <div className="toolbar">
        <SearchField
          autoFocus={focusSearch}
          label={t("Search dictionary")}
          placeholder={t("Search words or meanings")}
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(0);
          }}
        />
        <select
          aria-label={t("Filter words by level")}
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            setPage(0);
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
            setSaved((value) => !value);
            setPage(0);
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
                setQuery("");
                setSaved(false);
                setLevel("");
                setPage(0);
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
          setPage(value);
          setFocusWord(null);
          setFocusRequest((request) => request + 1);
        }}
      />
    </>
  );
}
