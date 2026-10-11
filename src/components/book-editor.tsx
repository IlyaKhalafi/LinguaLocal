"use client";
import { Plus, Trash2 } from "lucide-react";
import { levels, type Book, type Resource } from "@/lib/schema";
import type { MediaFile } from "@/lib/media-types";
import { Badge } from "./ui";
export function BookEditor({
  book,
  setBook,
  editingId,
  files,
  onSave,
  onCancel,
}: {
  book: Book;
  setBook: (book: Book) => void;
  editingId: string | null;
  files: MediaFile[];
  onSave: () => void;
  onCancel: () => void;
}) {
  function updateResource(index: number, next: Partial<Resource>) {
    setBook({
      ...book,
      resources: book.resources.map((resource, i) =>
        i === index ? { ...resource, ...next } : resource,
      ),
    });
  }
  return (
    <section className="panel studio-form">
      <h2>
        {editingId
          ? "A new chapter for this book"
          : "Bring a new book to the shelf"}
      </h2>
      <div className="form-field">
        <label htmlFor="book-title">Book title</label>
        <input
          id="book-title"
          value={book.title}
          onChange={(e) => setBook({ ...book, title: e.target.value })}
          maxLength={120}
        />
      </div>
      <div className="form-field">
        <label htmlFor="book-subtitle">Cover subtitle</label>
        <input
          id="book-subtitle"
          value={book.subtitle}
          onChange={(e) => setBook({ ...book, subtitle: e.target.value })}
          maxLength={150}
        />
      </div>
      <div className="form-field">
        <label htmlFor="book-description">Description</label>
        <textarea
          id="book-description"
          rows={3}
          value={book.description}
          onChange={(e) => setBook({ ...book, description: e.target.value })}
        />
      </div>
      <div className="studio-form-row">
        <div className="form-field">
          <label htmlFor="book-level">Level</label>
          <select
            id="book-level"
            value={book.level}
            onChange={(e) =>
              setBook({
                ...book,
                level: e.target.value as Book["level"],
              })
            }
          >
            {levels.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="book-color">Cover colour</label>
          <select
            id="book-color"
            value={book.color}
            onChange={(e) =>
              setBook({
                ...book,
                color: e.target.value as Book["color"],
              })
            }
          >
            {["peach", "mint", "lavender", "blue", "yellow", "rose"].map(
              (item) => (
                <option key={item}>{item}</option>
              ),
            )}
          </select>
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="book-category">Subject</label>
        <input
          id="book-category"
          value={book.category}
          onChange={(e) => setBook({ ...book, category: e.target.value })}
        />
      </div>
      <div className="section-heading">
        <h3>Book resources</h3>
        <button
          className="button secondary"
          onClick={() =>
            setBook({
              ...book,
              resources: [
                ...book.resources,
                {
                  id: `resource-${Date.now()}`,
                  title: "",
                  kind: "audio",
                  file: "",
                  captions: undefined,
                  duration: "",
                  unit: "Unit 1",
                  transcript: "",
                },
              ],
            })
          }
        >
          <Plus size={13} />
          Add resource
        </button>
      </div>
      {book.resources.map((resource, index) => (
        <div className="studio-resource" key={resource.id}>
          <div className="section-heading">
            <Badge>Resource {index + 1}</Badge>
            <button
              className="icon-button"
              aria-label={`Remove resource ${index + 1}`}
              onClick={() =>
                setBook({
                  ...book,
                  resources: book.resources.filter((_, i) => i !== index),
                })
              }
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="form-field">
            <label htmlFor={`resource-title-${index}`}>Resource title</label>
            <input
              id={`resource-title-${index}`}
              value={resource.title}
              onChange={(e) => updateResource(index, { title: e.target.value })}
            />
          </div>
          <div className="studio-form-row">
            <div className="form-field">
              <label htmlFor={`resource-kind-${index}`}>Type</label>
              <select
                id={`resource-kind-${index}`}
                value={resource.kind}
                onChange={(e) =>
                  updateResource(index, {
                    kind: e.target.value as Resource["kind"],
                    file: "",
                    captions: undefined,
                  })
                }
              >
                <option value="audio">Audio</option>
                <option value="video">Video</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor={`resource-unit-${index}`}>Unit</label>
              <input
                id={`resource-unit-${index}`}
                value={resource.unit}
                onChange={(e) =>
                  updateResource(index, { unit: e.target.value })
                }
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor={`resource-file-${index}`}>Media file</label>
            <select
              id={`resource-file-${index}`}
              value={resource.file}
              onChange={(e) => updateResource(index, { file: e.target.value })}
            >
              <option value="">Choose a file</option>
              {resource.file &&
                !files.some((file) => file.file === resource.file) && (
                  <option>{resource.file}</option>
                )}
              {files
                .filter((file) => file.kind === resource.kind)
                .map((file) => (
                  <option key={file.file}>{file.file}</option>
                ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor={`resource-duration-${index}`}>
              Duration or page count
            </label>
            <input
              id={`resource-duration-${index}`}
              value={resource.duration}
              placeholder="2:30 or 12 pages"
              onChange={(e) =>
                updateResource(index, { duration: e.target.value })
              }
            />
          </div>
          {resource.kind !== "pdf" && (
            <div className="form-field">
              <label htmlFor={`resource-transcript-${index}`}>Transcript</label>
              <textarea
                id={`resource-transcript-${index}`}
                rows={3}
                value={resource.transcript ?? ""}
                onChange={(e) =>
                  updateResource(index, { transcript: e.target.value })
                }
              />
            </div>
          )}
          {resource.kind === "video" && (
            <div className="form-field">
              <label htmlFor={`resource-captions-${index}`}>
                Captions file
              </label>
              <select
                id={`resource-captions-${index}`}
                value={resource.captions ?? ""}
                onChange={(e) =>
                  updateResource(index, {
                    captions: e.target.value || undefined,
                  })
                }
              >
                <option value="">No captions</option>
                {resource.captions &&
                  !files.some((file) => file.file === resource.captions) && (
                    <option>{resource.captions}</option>
                  )}
                {files
                  .filter((file) => file.kind === "captions")
                  .map((file) => (
                    <option key={file.file}>{file.file}</option>
                  ))}
              </select>
            </div>
          )}
        </div>
      ))}
      <div className="button-row">
        <button className="button primary" onClick={onSave}>
          Keep book in draft
        </button>
        <button className="button secondary" onClick={() => onCancel()}>
          Cancel edit
        </button>
      </div>
    </section>
  );
}
