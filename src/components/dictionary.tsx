"use client";
import { useMemo, useState } from "react";
import { Bookmark, Search } from "lucide-react";
import { levels, type Word } from "@/lib/schema";
import { useProgress } from "./progress-provider";
import { WordCard } from "./word-card";
import { EmptyState, PageHeading } from "./ui";
import Link from "next/link";

export function Dictionary({ words }: { words: Word[]; serverDay: string }) {
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
        title="Dictionary"
        action={
          <Link className="button secondary" href="/flashcards">
            <Bookmark size={14} />
            Flashcards
          </Link>
        }
      />
      <div className="toolbar">
        <label className="search-field">
          <Search size={17} />
          <span className="sr-only">Search dictionary</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search words or meanings"
          />
        </label>
        <select
          aria-label="Filter words by level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="">All levels</option>
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
          Saved words
        </button>
      </div>
      <p className="result-caption" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "word" : "words"}
      </p>
      {filtered.length ? (
        <div className="dictionary-grid">
          {filtered.slice(0, 100).map((word) => (
            <WordCard key={word.id} word={word} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={saved ? "No saved words" : "No matching words"}
          description={
            saved
              ? "Save words using the bookmark button."
              : "Try a different search or clear the filters."
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
              Clear filters
            </button>
          }
        />
      )}
      {filtered.length > 100 && (
        <p className="result-caption" style={{ marginTop: 20 }}>
          Showing the first 100 matches. Refine your search to find a specific
          word.
        </p>
      )}
    </>
  );
}
