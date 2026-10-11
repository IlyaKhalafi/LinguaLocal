"use client";
import { useLocale } from "@/components/locale-provider";
import { useMemo, useState } from "react";
import { Bookmark, Search } from "lucide-react";
import { levels, type Word } from "@/lib/schema";
import { useProgress } from "./progress-provider";
import { WordCard } from "./word-card";
import { EmptyState, PageHeading } from "./ui";
import Link from "next/link";

export function Dictionary({ words }: { words: Word[] }) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
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
  return (
    <>
      <PageHeading
        title={t("Dictionary")}
        action={
          <Link className="button secondary" href="/flashcards">
            <Bookmark size={14} />
            {t("Flashcards")}
          </Link>
        }
      />
      <div className="toolbar">
        <label className="search-field">
          <Search size={17} />
          <span className="sr-only">{t("Search dictionary")}</span>
          <input
            dir="auto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search words or meanings")}
          />
        </label>
        <select
          aria-label={t("Filter words by level")}
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="">{t("All levels")}</option>
          {levels.map((level) => (
            <option key={level}>{level}</option>
          ))}
        </select>
        <button
          className={`button ${saved ? "primary" : "secondary"}`}
          aria-pressed={saved}
          onClick={() => setSaved(!saved)}
        >
          <Bookmark size={14} />
          {t("Saved words")}
        </button>
      </div>
      <p className="result-caption" aria-live="polite">
        {t("{count} words", { count: filtered.length })}
      </p>
      {filtered.length ? (
        <div className="dictionary-grid">
          {filtered.slice(0, 100).map((word) => (
            <WordCard key={word.id} word={word} />
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
              }}
            >
              {t("Clear filters")}
            </button>
          }
        />
      )}
      {filtered.length > 100 && (
        <p className="result-caption" style={{ marginTop: 20 }}>
          {t(
            "Showing the first 100 matches. Refine your search to find a specific word.",
          )}
        </p>
      )}
    </>
  );
}
