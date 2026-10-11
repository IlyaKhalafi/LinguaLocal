"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { BookCard, EmptyState, PageHeading } from "./ui";
import { levels, type Book } from "@/lib/schema";

export function Library({ books }: { books: Book[] }) {
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
      <PageHeading title="Library" />
      <div className="toolbar">
        <label className="search-field">
          <Search size={17} />
          <span className="sr-only">Search books</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books"
          />
        </label>
        <select
          aria-label="Filter books by level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="">All levels</option>
          {levels.map((level) => (
            <option key={level}>{level}</option>
          ))}
        </select>
        <select
          aria-label="Filter books by category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All subjects</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </div>
      <p className="result-caption" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "book" : "books"} on your
        shelf
      </p>
      {filtered.length ? (
        <div className="book-grid library-grid">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No matching books"
          description="Try a different search or choose another level."
          action={
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setLevel("");
                setCategory("");
              }}
            >
              Clear filters
            </button>
          }
        />
      )}
    </>
  );
}
