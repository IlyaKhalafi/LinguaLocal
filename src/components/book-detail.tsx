"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Download,
  FileText,
  Headphones,
  Play,
  Video,
} from "lucide-react";
import { Badge, Cover, EmptyState } from "./ui";
import { MediaPlayer, mediaUrl } from "./media-player";
import type { Book, Resource } from "@/lib/schema";

export function BookDetail({ book }: { book: Book }) {
  const [selected, setSelected] = useState<Resource | null>(null);
  const [kind, setKind] = useState("all");
  const resources = book.resources.filter(
    (resource) => kind === "all" || resource.kind === kind,
  );
  return (
    <>
      <Link className="back-link" href="/library">
        <ArrowLeft size={14} />
        Back to your bookshelf
      </Link>
      <div className="book-detail">
        <Cover book={book} />
        <div>
          <p className="eyebrow">{book.category.toUpperCase()}</p>
          <h1>{book.title}</h1>
          <p className="detail-description">{book.description}</p>
          <div className="button-row">
            <Badge tone="green">{book.level}</Badge>
            <Badge>
              {book.resources.length}{" "}
              {book.resources.length === 1 ? "resource" : "resources"}
            </Badge>
            <Badge>Available on your school network</Badge>
          </div>
          <div className="resource-list">
            <div className="section-heading">
              <h2>Open a new chapter</h2>
            </div>
            <div className="tabs">
              {["all", "audio", "video", "pdf"].map((item) => (
                <button
                  key={item}
                  className={`tab ${kind === item ? "active" : ""}`}
                  aria-pressed={kind === item}
                  onClick={() => setKind(item)}
                >
                  {item === "all"
                    ? "All resources"
                    : item === "pdf"
                      ? "Reading"
                      : item === "audio"
                        ? "Listening"
                        : "Watching"}
                </button>
              ))}
            </div>
            {resources.map((resource) => {
              const Icon =
                resource.kind === "audio"
                  ? Headphones
                  : resource.kind === "video"
                    ? Video
                    : FileText;
              return (
                <div className="resource-item" key={resource.id}>
                  <span className="resource-icon">
                    <Icon size={19} />
                  </span>
                  <div className="resource-title">
                    <h3>{resource.title}</h3>
                    <p>
                      {resource.unit} ·{" "}
                      {resource.kind === "pdf" ? "PDF" : resource.duration}
                    </p>
                  </div>
                  {resource.kind === "pdf" ? (
                    <a
                      className="button secondary"
                      href={mediaUrl(resource.file)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Read
                      <FileText size={13} />
                    </a>
                  ) : (
                    <button
                      className="button secondary"
                      onClick={() => {
                        setSelected(resource);
                      }}
                    >
                      <Play size={13} />
                      Play
                    </button>
                  )}
                  <a
                    className="icon-button"
                    href={`${mediaUrl(resource.file)}?download=1`}
                    aria-label={`Download ${resource.title}`}
                  >
                    <Download size={16} />
                  </a>
                </div>
              );
            })}
            {resources.length === 0 && (
              <EmptyState
                title="Room for something wonderful."
                description="Your school can add audio, video, and reading materials by updating its content pack on the server."
              />
            )}
          </div>
        </div>
      </div>
      {selected && (
        <MediaPlayer
          key={selected.id}
          resource={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
