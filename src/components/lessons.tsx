"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Clock, Search } from "lucide-react";
import { levels, type Lesson } from "@/lib/schema";
import { useProgress } from "./progress-provider";
import { Badge, EmptyState, PageHeading } from "./ui";

export function Lessons({ lessons }: { lessons: Lesson[] }) {
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
      <PageHeading
        eyebrow="SOMETHING NEW, EVERY DAY"
        title="Small lessons. Lasting discoveries."
        description="A few focused minutes to build your English, one idea at a time."
      />
      <div className="toolbar">
        <label className="search-field">
          <Search size={16} />
          <span className="sr-only">Search lessons</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What would you like to learn?"
          />
        </label>
        <select
          aria-label="Filter lessons by level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="">All levels</option>
          {levels.map((level) => (
            <option key={level}>{level}</option>
          ))}
        </select>
      </div>
      <div className="tabs" style={{ marginBottom: 23 }}>
        {["", "Grammar", "Vocabulary", "Reading", "Speaking"].map((item) => (
          <button
            className={`tab ${category === item ? "active" : ""}`}
            key={item}
            onClick={() => setCategory(item)}
          >
            {item || "All lessons"}
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
                  {lesson.category}
                </Badge>
                <Badge>{lesson.level}</Badge>
              </div>
              <h3>{lesson.title}</h3>
              <p>{lesson.description}</p>
              <div className="lesson-card-bottom">
                <span>
                  <Clock size={13} />
                  {lesson.minutes} min read
                </span>
                {progress.completed.includes(lesson.id) ? (
                  <span>
                    <CheckCircle2 size={14} />
                    Completed
                  </span>
                ) : (
                  <span>
                    Let’s learn
                    <ArrowRight size={14} />
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="A different path to learning."
          description="Try another category or search to find your next lesson."
          action={
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setCategory("");
                setLevel("");
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
