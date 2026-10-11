"use client";
import { useMemo, useState } from "react";
import { Bookmark, Leaf, Search } from "lucide-react";
import { levels, type Word } from "@/lib/schema";
import { useToday } from "@/lib/use-today";
import { dailyWord } from "@/lib/learning";
import { useProgress } from "./progress-provider";
import { WordCard } from "./word-card";
import { EmptyState, PageHeading } from "./ui";
import Link from "next/link";

export function Dictionary({
  words,
  serverDay,
}: {
  words: Word[];
  serverDay: string;
}) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [saved, setSaved] = useState(false);
  const { progress } = useProgress();
  const day = useToday(serverDay);
  const featured = dailyWord(words, new Date(`${day}T12:00:00`));
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
        eyebrow="MAKE WORDS YOUR OWN"
        title="A little word. A whole new world."
        description="Explore meanings, collect favourites, and grow your vocabulary."
        action={
          <Link className="button secondary" href="/flashcards">
            <Bookmark size={14} />
            Study your words
          </Link>
        }
      />
      <div className="dictionary-intro">
        <Leaf size={28} strokeWidth={1.5} />
        <div>
          <h3>A word to take with you today</h3>
          <p>
            <strong>{featured.word}</strong> · {featured.definition} Save a word
            with the bookmark to practise it later.
          </p>
        </div>
      </div>
      <div className="toolbar">
        <label className="search-field">
          <Search size={17} />
          <span className="sr-only">Search dictionary</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a word, meaning, or synonym..."
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
        {filtered.length} {filtered.length === 1 ? "word" : "words"}{" "}
        {saved ? "in your collection" : "to discover"} · Curated offline
        dictionary
      </p>
      {filtered.length ? (
        <div className="dictionary-grid">
          {filtered.slice(0, 100).map((word) => (
            <WordCard key={word.id} word={word} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            saved
              ? "Your word collection starts here."
              : "We haven’t met this word yet."
          }
          description={
            saved
              ? "Bookmark a few words from the dictionary, then come back to study them."
              : "Try a synonym or a shorter search. Your school can add more entries through a content pack."
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
              Explore all words
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
