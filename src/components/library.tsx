"use client";
import { SearchField } from "./search-field";
import { useLocale } from "@/components/locale-provider";
import { useMemo, useState } from "react";
import { BookCard, EmptyState, PageHeading } from "./ui";
import { levels, type Book } from "@/lib/schema";

export function Library({ books }: { books: Book[] }) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const categories = [...new Set(books.map((book) => book.category))];
  const filtered = useMemo(
    () =>
      books.filter(
        (book) =>
          `${book.title} ${book.subtitle} ${book.category}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (!level || book.level === level) &&
          (!category || book.category === category),
      ),
    [books, query, level, category],
  );
  return (
    <>
      <PageHeading title={t("Library")} />
      <div className="toolbar">
        <SearchField
          label={t("Search books")}
          placeholder={t("Search books")}
          value={query}
          onChange={setQuery}
        />
        <select
          aria-label={t("Filter books by level")}
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="">{t("All levels")}</option>
          {levels.map((level) => (
            <option key={level}>{level}</option>
          ))}
        </select>
        <select
          aria-label={t("Filter books by category")}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">{t("All subjects")}</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </div>
      <p className="result-caption" aria-live="polite">
        {t("{count} books", { count: filtered.length })}
      </p>
      {filtered.length ? (
        <div className="book-grid library-grid">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("No matching books")}
          description={t("Try a different search or choose another level.")}
          action={
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setLevel("");
                setCategory("");
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
