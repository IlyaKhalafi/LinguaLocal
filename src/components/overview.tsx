"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Flame,
  GraduationCap,
  Layers,
  Leaf,
  Sparkles,
} from "lucide-react";
import { useProgress } from "./progress-provider";
import { BookCard, PageHeading } from "./ui";
import { WordCard } from "./word-card";
import { dailyWord, streak } from "@/lib/learning";
import { useToday } from "@/lib/use-today";
import type { ContentPack, Settings } from "@/lib/schema";

export function Overview({
  content,
  settings,
  serverDay,
}: {
  content: ContentPack;
  settings: Settings;
  serverDay: string;
}) {
  const { progress } = useProgress();
  const day = useToday(serverDay);
  const date = new Date(`${day}T12:00:00`);
  const today = progress.activity[day] ?? 0;
  const word = dailyWord(content.words, date);
  const completed = content.lessons.filter((lesson) =>
    progress.completed.includes(lesson.id),
  ).length;
  const stats = [
    { icon: BookOpen, value: content.books.length, label: "Books to explore" },
    { icon: GraduationCap, value: completed, label: "Lessons completed" },
    {
      icon: Layers,
      value: content.words.filter((w) => progress.saved.includes(w.id)).length,
      label: "Words collected",
    },
    {
      icon: Flame,
      value: streak(progress.activity, date),
      label: "Days in your streak",
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="MAKE ROOM FOR A LITTLE DISCOVERY"
        title="Your next chapter starts here."
        description={settings.welcome}
        action={
          <Link className="button secondary" href="/progress">
            <Leaf size={14} />
            My learning journey
          </Link>
        }
      />
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">A SPACE TO LEARN. A PLACE TO GROW.</p>
          <h2>
            Big possibilities.
            <br />
            <em>One little step at a time.</em>
          </h2>
          <p>
            Your books, your favourite words, and a little everyday practice.
            Everything you need, right here at school.
          </p>
          <Link className="button primary" href="/library">
            Explore the library
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit" />
          <div className="hero-book book-back">
            <Leaf size={31} />
            Words
            <br />
            in Bloom<small>GROW YOUR VOCABULARY</small>
          </div>
          <div className="hero-book book-front">
            Everyday
            <br />
            English
            <BookOpen size={29} />
            <small>THE WORLD IS YOURS</small>
          </div>
          <Sparkles className="hero-spark" size={35} strokeWidth={1} />
        </div>
      </section>
      <div className="stat-grid">
        {stats.map(({ icon: Icon, value, label }) => (
          <div className="stat-card" key={label}>
            <span className="stat-icon">
              <Icon size={19} />
            </span>
            <div>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-columns">
        <section>
          <div className="section-heading">
            <div>
              <h2>A good place to start</h2>
              <p>A few favourites from your school’s bookshelf.</p>
            </div>
            <Link className="text-link" href="/library">
              View all books
              <ArrowRight size={13} />
            </Link>
          </div>
          <div className="book-grid">
            {content.books.slice(0, 3).map((book) => (
              <BookCard book={book} key={book.id} />
            ))}
          </div>
          {content.books.length === 0 && (
            <p className="muted">
              Your school can add books in School settings.
            </p>
          )}
          <div className="practice-banner">
            <span className="stat-icon">
              <Sparkles size={22} />
            </span>
            <div>
              <h3>A little play goes a long way.</h3>
              <p>Make new words stick with a quick vocabulary game.</p>
            </div>
            <Link className="button secondary" href="/games">
              Let’s practise
              <ArrowRight size={12} />
            </Link>
          </div>
        </section>
        <aside className="dashboard-aside">
          <div className="daily-word-panel">
            <p className="eyebrow">
              <Sparkles size={12} />
              YOUR WORD OF THE DAY
            </p>
            <WordCard featured word={word} />
            <Link className="daily-word-link" href="/dictionary">
              Discover more words
              <ArrowRight size={12} />
            </Link>
          </div>
          <div className="panel goal-panel">
            <h3>Your daily dose of learning</h3>
            <div
              className="goal-circle"
              style={
                {
                  "--percent": `${Math.min(100, (today / progress.goal) * 100)}%`,
                } as React.CSSProperties
              }
            >
              <div>
                <strong>
                  {today}
                  <span style={{ fontSize: 13, color: "#a0ac94" }}>
                    {" "}
                    / {progress.goal}
                  </span>
                </strong>
                <small>PRACTICE ACTIVITIES</small>
              </div>
            </div>
            <p>
              {today >= progress.goal
                ? "You reached today’s goal. Beautiful work!"
                : "A few minutes today. A little more confidence tomorrow."}
            </p>
            <Link className="text-link" href="/flashcards">
              Keep your curiosity going
              <ArrowRight size={12} />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
