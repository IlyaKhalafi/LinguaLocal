"use client";
import { useLocale } from "@/components/locale-provider";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Headphones,
  Leaf,
  Volume2,
} from "lucide-react";
import type { Book, Word } from "@/lib/schema";
import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
  contentLanguage,
}: {
  contentLanguage?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1
          lang={contentLanguage}
          dir={contentLanguage === "en" ? "ltr" : undefined}
        >
          {title}
        </h1>
        {description && (
          <p
            className="muted"
            lang={contentLanguage}
            dir={contentLanguage === "en" ? "ltr" : undefined}
          >
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <BookOpen size={32} />
      <h2>{title}</h2>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  );
}
export function Cover({
  book,
  compact = false,
}: {
  book: Book;
  compact?: boolean;
}) {
  return (
    <div
      lang="en"
      dir="ltr"
      className={`book-cover ${book.color} ${compact ? "compact" : ""}`}
    >
      <div className="cover-top">
        <span aria-hidden="true">
          <Leaf size={12} />
        </span>
        <BookOpen size={11} aria-hidden="true" />
      </div>
      <div className="cover-art" aria-hidden="true">
        <div className="arch arch-one" />
        <div className="arch arch-two" />
        <div className="art-circle" />
        <Leaf className="art-leaf" strokeWidth={1} size={82} />
      </div>
      <div className="cover-title">{book.title}</div>
      <div className="cover-subtitle">{book.subtitle}</div>
    </div>
  );
}
export function BookCard({
  book,
  headingLevel = 2,
}: {
  book: Book;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const { t } = useLocale();
  return (
    <Link className="book-card" href={`/library/${book.id}`}>
      <Cover book={book} />
      <div className="book-info">
        <div>
          <Heading lang="en" dir="ltr">
            {book.title}
          </Heading>
          <p lang="en" dir="ltr">
            {book.category}
          </p>
        </div>
        <ArrowUpRight size={19} />
      </div>
      <div className="book-meta">
        <Badge>{book.level}</Badge>
        <span>
          <Headphones size={13} />
          {t("{count} resources", { count: book.resources.length })}
        </span>
      </div>
    </Link>
  );
}
export const icons = { ArrowUpRight, Bookmark, BookOpen, Headphones, Volume2 };
export function downloadJson(data: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export type WordProps = { word: Word };
