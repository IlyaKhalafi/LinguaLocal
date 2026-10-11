"use client";
import { useLocale } from "@/components/locale-provider";
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
  const { t } = useLocale();
  const [selected, setSelected] = useState<Resource | null>(null);
  const [kind, setKind] = useState("all");
  const resources = book.resources.filter(
    (resource) => kind === "all" || resource.kind === kind,
  );
  return (
    <>
      <Link className="back-link" href="/library">
        <ArrowLeft size={14} />
        {t("Back to library")}
      </Link>
      <div className="book-detail">
        <Cover book={book} />
        <div>
          <p className="eyebrow">{book.category.toUpperCase()}</p>
          <h1 lang="en" dir="ltr">
            {book.title}
          </h1>
          <p className="detail-description" lang="en" dir="ltr">
            {book.description}
          </p>
          <div className="button-row">
            <Badge tone="green">{book.level}</Badge>
            <Badge>
              {t("{count} resources", { count: book.resources.length })}
            </Badge>
          </div>
          <div className="resource-list">
            <div className="section-heading">
              <h2>{t("Resources")}</h2>
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
                    ? t("All resources")
                    : item === "pdf"
                      ? t("Reading")
                      : item === "audio"
                        ? t("Listening")
                        : t("Watching")}
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
                    <h3 lang="en" dir="ltr">
                      {resource.title}
                    </h3>
                    <p lang="en" dir="ltr">
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
                      {t("Read")}
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
                      {t("Play")}
                    </button>
                  )}
                  <a
                    className="icon-button"
                    href={`${mediaUrl(resource.file)}?download=1`}
                    aria-label={t("Download {title}", {
                      title: resource.title,
                    })}
                  >
                    <Download size={16} />
                  </a>
                </div>
              );
            })}
            {resources.length === 0 && (
              <EmptyState
                title={t("No resources")}
                description={t("No resources in this category.")}
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
