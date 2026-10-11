import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Headphones,
  Leaf,
  Sparkles,
  Volume2,
} from "lucide-react";
import type { Book, Word } from "@/lib/schema";
import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
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
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <BookOpen size={32} />
      <h2>{title}</h2>
      <p className="muted">{description}</p>
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
    <div className={`book-cover ${book.color} ${compact ? "compact" : ""}`}>
      <div className="cover-top">
        <span>THE LINGUALOCAL COLLECTION</span>
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
      <div className="cover-footer">
        <span>LEARN SOMETHING NEW</span>
        <Sparkles size={14} />
      </div>
    </div>
  );
}
export function BookCard({ book }: { book: Book }) {
  return (
    <Link className="book-card" href={`/library/${book.id}`}>
      <Cover book={book} />
      <div className="book-info">
        <div>
          <h3>{book.title}</h3>
          <p>{book.category}</p>
        </div>
        <ArrowUpRight size={19} />
      </div>
      <div className="book-meta">
        <Badge>{book.level}</Badge>
        <span>
          <Headphones size={13} />
          {book.resources.length}{" "}
          {book.resources.length === 1 ? "resource" : "resources"}
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
