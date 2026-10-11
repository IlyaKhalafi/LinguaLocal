"use client";
import { useLocale } from "@/components/locale-provider";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileText,
  Headphones,
  Play,
  Video,
} from "lucide-react";
import { Badge, Cover, EmptyState } from "./ui";
import { MediaPlayer } from "./media-player";
import { mediaUrl } from "@/lib/media-url";
import type { Book, Resource } from "@/lib/schema";

export function BookDetail({ book }: { book: Book }) {
  const { t } = useLocale();
  const [selected, setSelected] = useState<Resource | null>(null);
  const [kind, setKind] = useState("all");
  const [playRequest, setPlayRequest] = useState(0);
  const opener = useRef<HTMLButtonElement | null>(null);
  const resourcesHeading = useRef<HTMLHeadingElement>(null);
  const kinds = [...new Set(book.resources.map((resource) => resource.kind))];
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
        <div className="book-summary">
          <h1 lang="en" dir="ltr">
            {book.title}
          </h1>
          <p className="detail-description" lang="en" dir="ltr">
            {book.description}
          </p>
          <div className="button-row">
            <Badge tone="green">{book.level}</Badge>
          </div>
        </div>
        <div className="resource-list">
          <div className="section-heading">
            <h2 ref={resourcesHeading} tabIndex={-1}>
              {t("Resources")}
            </h2>
          </div>
          {kinds.length > 1 && (
            <div className="tabs">
              {["all", ...kinds].map((item) => (
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
          )}
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
                    {[
                      resource.unit !== resource.title ? resource.unit : "",
                      resource.kind === "pdf" ? "PDF" : resource.duration,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
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
                    onClick={(event) => {
                      opener.current = event.currentTarget;
                      setSelected(resource);
                      setPlayRequest((request) => request + 1);
                    }}
                  >
                    <Play size={13} />
                    {t("Play")}
                  </button>
                )}
                <a
                  className="icon-button"
                  href={`${mediaUrl(resource.file)}?download=1`}
                  download
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t("Download {title}", {
                    title: resource.title,
                  })}
                >
                  <Download size={16} />
                </a>
              </div>
            );
          })}
          {resources.length === 0 && <EmptyState title={t("No resources")} />}
        </div>
      </div>
      {selected && (
        <MediaPlayer
          key={selected.id}
          resource={selected}
          playRequest={playRequest}
          onClose={() => {
            setSelected(null);
            (opener.current?.isConnected
              ? opener.current
              : resourcesHeading.current
            )?.focus();
          }}
        />
      )}
    </>
  );
}
