"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Download,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import {
  bookSchema,
  packSchema,
  wordSchema,
  lessonSchema,
  type Book,
  type ContentPack,
  type Word,
  type Lesson,
} from "@/lib/schema";
import type { MediaFile } from "@/lib/media-types";
import { putJson, requestJson, uploadMedia } from "@/lib/client-api";
import { Badge, downloadJson, PageHeading } from "./ui";
import { BookEditor } from "./book-editor";
import { WordEditor } from "./word-editor";
import { LessonEditor } from "./lesson-editor";
import { clearDraft, storeDraft, useStudioDraft } from "@/lib/studio-draft";

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || `item-${Date.now()}`
  );
}
const blankBook: Book = {
  id: "",
  title: "",
  subtitle: "",
  description: "",
  level: "A1",
  color: "peach",
  category: "General English",
  resources: [],
};
const blankWord: Word = {
  id: "",
  word: "",
  phonetic: "",
  part: "noun",
  definition: "",
  example: "",
  level: "A1",
  synonyms: [],
};

export function ContentStudio({
  initialContent,
  initialVersion,
}: {
  initialContent: ContentPack;
  initialVersion: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [version, setVersion] = useState(initialVersion);
  const [tab, setTab] = useState("books");
  const [wordQuery, setWordQuery] = useState("");
  const [book, setBook] = useState<Book | null>(null);
  const [word, setWord] = useState<Word | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const draft = useStudioDraft();
  useEffect(() => {
    if (!dirty && !book && !word && !lesson) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    function guard(event: MouseEvent) {
      if (!book && !word && !lesson) return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        anchor &&
        !window.confirm(
          "This item has not been kept in the draft. Leave this edit?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    document.addEventListener("click", guard, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guard, true);
    };
  }, [dirty, book, word, lesson]);
  function change(next: ContentPack) {
    setContent(next);
    setDirty(true);
    const stored = storeDraft(next, version);
    setMessage(
      stored
        ? "Your draft is kept in this browser. Save the collection to make it available to everyone."
        : "Your draft is in memory. Browser storage is unavailable, so download a copy before leaving this page.",
    );
  }
  async function loadFiles() {
    try {
      setFiles((await requestJson<{ files: MediaFile[] }>("/api/media")).files);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load files.",
      );
    }
  }
  function selectBook(item: Book | null) {
    setBook(item ? structuredClone(item) : structuredClone(blankBook));
    setWord(null);
    setEditingId(item?.id ?? null);
    setConfirmDelete(null);
    void loadFiles();
  }
  function selectWord(item: Word | null) {
    setWord(item ? structuredClone(item) : structuredClone(blankWord));
    setBook(null);
    setEditingId(item?.id ?? null);
    setConfirmDelete(null);
  }
  function saveBook() {
    if (!book) return;
    const parsed = bookSchema.safeParse({
      ...book,
      id: editingId ?? slug(book.title),
    });
    if (!parsed.success) {
      setMessage(
        parsed.error.issues
          .slice(0, 4)
          .map((issue) => `${issue.path.join(".")} ${issue.message}`)
          .join(" "),
      );
      return;
    }
    if (
      !editingId &&
      content.books.some((item) => item.id === parsed.data.id)
    ) {
      setMessage(
        "A book with that title already exists. Choose a different title.",
      );
      return;
    }
    change({
      ...content,
      books: editingId
        ? content.books.map((item) =>
            item.id === editingId ? parsed.data : item,
          )
        : [...content.books, parsed.data],
    });
    setBook(null);
    setEditingId(null);
  }
  function saveWord(candidate: Word) {
    const parsed = wordSchema.safeParse({
      ...candidate,
      id: editingId ?? slug(candidate.word),
    });
    if (!parsed.success) {
      setMessage(
        parsed.error.issues
          .slice(0, 4)
          .map((issue) => `${issue.path.join(".")} ${issue.message}`)
          .join(" "),
      );
      return;
    }
    if (
      !editingId &&
      content.words.some((item) => item.id === parsed.data.id)
    ) {
      setMessage("That word is already in your collection.");
      return;
    }
    change({
      ...content,
      words: editingId
        ? content.words.map((item) =>
            item.id === editingId ? parsed.data : item,
          )
        : [...content.words, parsed.data],
    });
    setWord(null);
    setEditingId(null);
  }
  async function saveCollection() {
    setBusy(true);
    setMessage("");
    try {
      const parsed = packSchema.parse(content);
      const result = await putJson("/api/content", parsed, {
        "If-Match": version,
      });
      if (result.version) setVersion(result.version);
      setDirty(false);
      clearDraft();
      setMessage("Your collection is saved and ready to explore.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save this collection.",
      );
    } finally {
      setBusy(false);
    }
  }
  function selectLesson(item: Lesson | null) {
    setLesson(
      item
        ? structuredClone(item)
        : {
            id: "",
            title: "",
            description: "",
            level: "A1",
            category: "Grammar",
            minutes: 5,
            sections: [{ title: "", body: "" }],
            question: "",
            options: ["", "", ""],
            answer: 0,
            explanation: "",
          },
    );
    setBook(null);
    setWord(null);
    setEditingId(item?.id ?? null);
  }
  function saveLesson() {
    if (!lesson) return;
    const result = lessonSchema.safeParse({
      ...lesson,
      id: editingId ?? slug(lesson.title),
    });
    if (!result.success) {
      setMessage(
        result.error.issues
          .slice(0, 4)
          .map((issue) => `${issue.path.join(".")} ${issue.message}`)
          .join(" "),
      );
      return;
    }
    if (
      !editingId &&
      content.lessons.some((item) => item.id === result.data.id)
    ) {
      setMessage("A lesson with that title already exists.");
      return;
    }
    change({
      ...content,
      lessons: editingId
        ? content.lessons.map((item) =>
            item.id === editingId ? result.data : item,
          )
        : [...content.lessons, result.data],
    });
    setLesson(null);
    setEditingId(null);
  }
  return (
    <>
      <Link className="back-link" href="/settings">
        <ArrowLeft size={14} />
        School settings
      </Link>
      <PageHeading
        eyebrow="BUILT AROUND YOUR CLASSROOM"
        title="Make room for your own discoveries."
        description="Add books, connect media, and grow your school’s dictionary."
        action={
          <button
            className="button primary"
            disabled={
              !dirty ||
              busy ||
              book !== null ||
              word !== null ||
              lesson !== null
            }
            onClick={() => void saveCollection()}
          >
            <Save size={14} />
            {busy ? "Saving..." : "Save collection"}
          </button>
        }
      />
      <div className="studio-notice">
        <BookOpen size={18} />
        <p>
          Changes stay in your draft until you save.{" "}
          <button
            className="text-link"
            style={{ background: "none", border: 0 }}
            onClick={() => downloadJson(content, "lingualocal-content.json")}
          >
            Download a copy
            <Download size={12} />
          </button>
        </p>
        {dirty && <Badge tone="peach">Unsaved draft</Badge>}
      </div>
      {draft && !dirty && (
        <div className="inline-message" style={{ marginBottom: 22 }}>
          <p>
            A collection draft is saved in this browser. Restore it to keep
            working, or download a copy before starting a new draft.
          </p>
          <div className="button-row" style={{ marginTop: 12 }}>
            <button
              className="button secondary"
              onClick={() => {
                setContent(draft.content);
                setVersion(draft.version);
                setDirty(true);
                setMessage(
                  "Draft restored. Save it to share your collection. If the school collection changed, download this draft and reapply it to the latest version.",
                );
              }}
            >
              Restore my draft
            </button>
            <button
              className="button secondary"
              onClick={() =>
                downloadJson(draft.content, "lingualocal-draft.json")
              }
            >
              Download draft
            </button>
            <button className="button secondary" onClick={clearDraft}>
              Discard saved draft
            </button>
          </div>
        </div>
      )}
      {(book || word || lesson) && (
        <p className="inline-message" style={{ marginBottom: 20 }}>
          Keep your item in the draft or cancel the edit before switching tabs
          or saving the collection.
        </p>
      )}
      <div className="tabs" style={{ marginBottom: 22 }}>
        {[
          { id: "books", label: "Books & media" },
          { id: "words", label: "Dictionary words" },
          { id: "lessons", label: "Lessons" },
          { id: "files", label: "Media files" },
        ].map((item) => (
          <button
            className={`tab ${tab === item.id ? "active" : ""}`}
            disabled={Boolean(book || word || lesson)}
            aria-pressed={tab === item.id}
            key={item.id}
            onClick={() => {
              setTab(item.id);
              setBook(null);
              setWord(null);
              setLesson(null);
              setConfirmDelete(null);
              if (item.id === "files") void loadFiles();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {message && (
        <p
          className="inline-message"
          role="status"
          style={{ marginBottom: 22 }}
        >
          {message}
        </p>
      )}
      {tab === "books" && (
        <div className="studio-layout">
          <section className="panel">
            <div className="section-heading">
              <h2>Your bookshelf</h2>
              <button
                className="button secondary"
                disabled={Boolean(book || word || lesson)}
                onClick={() => selectBook(null)}
              >
                <Plus size={14} />
                Add book
              </button>
            </div>
            {content.books.map((item) => (
              <div className="studio-row" key={item.id}>
                <span className={`studio-swatch ${item.color}`} />
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    {item.level} · {item.resources.length} resources
                  </p>
                </div>
                <button
                  className="text-link"
                  style={{ border: 0, background: "none" }}
                  disabled={Boolean(book || word || lesson)}
                  onClick={() => selectBook(item)}
                >
                  Edit
                </button>
                <button
                  className="icon-button"
                  aria-label={`Remove ${item.title}`}
                  onClick={() => setConfirmDelete(item.id)}
                >
                  <Trash2 size={15} />
                </button>
                {confirmDelete === item.id && (
                  <div className="studio-delete">
                    <p>
                      Remove this book from the draft? Media files will stay on
                      the server.
                    </p>
                    <button
                      className="button secondary"
                      onClick={() => setConfirmDelete(null)}
                    >
                      Keep book
                    </button>
                    <button
                      className="button primary"
                      onClick={() => {
                        change({
                          ...content,
                          books: content.books.filter((b) => b.id !== item.id),
                        });
                        setConfirmDelete(null);
                        if (book?.id === item.id) setBook(null);
                      }}
                    >
                      Remove book
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>
          {book ? (
            <BookEditor
              book={book}
              setBook={setBook}
              editingId={editingId}
              files={files}
              onSave={saveBook}
              onCancel={() => setBook(null)}
            />
          ) : (
            <div className="panel studio-welcome">
              <BookOpen size={37} />
              <h2>Every book has a place here.</h2>
              <p>
                Select a book to connect its audio, videos, and reading
                materials. Or add a new title to your school’s shelf.
              </p>
            </div>
          )}
        </div>
      )}
      {tab === "words" && (
        <div className="studio-layout">
          <section className="panel">
            <div className="section-heading">
              <h2>Your dictionary</h2>
              <button
                className="button secondary"
                disabled={Boolean(book || word || lesson)}
                onClick={() => selectWord(null)}
              >
                <Plus size={14} />
                Add word
              </button>
            </div>
            <div className="form-field">
              <label htmlFor="studio-word-search">
                Find a dictionary entry
              </label>
              <input
                id="studio-word-search"
                value={wordQuery}
                onChange={(e) => setWordQuery(e.target.value)}
                placeholder="Search your words..."
              />
            </div>
            {content.words
              .filter((item) =>
                item.word.toLowerCase().includes(wordQuery.toLowerCase()),
              )
              .slice(0, 200)
              .map((item) => (
                <div className="studio-row" key={item.id}>
                  <div>
                    <h3>{item.word}</h3>
                    <p>
                      {item.level} · {item.part}
                    </p>
                  </div>
                  <button
                    className="text-link"
                    style={{ border: 0, background: "none" }}
                    disabled={Boolean(book || word || lesson)}
                    onClick={() => selectWord(item)}
                  >
                    Edit
                  </button>
                </div>
              ))}
            {content.words.length > 200 && (
              <p className="muted">
                Showing up to 200 matching entries. Search to find another word.
              </p>
            )}
          </section>
          {word ? (
            <WordEditor
              word={word}
              setWord={setWord}
              editingId={editingId}
              onSave={saveWord}
              onCancel={() => setWord(null)}
            />
          ) : (
            <div className="panel studio-welcome">
              <BookOpen size={37} />
              <h2>Collect something worth knowing.</h2>
              <p>
                Add a word with a clear definition and a memorable example. It
                will become part of the dictionary, flashcards, and games.
              </p>
            </div>
          )}
        </div>
      )}
      {tab === "lessons" && (
        <div className="studio-layout">
          <section className="panel">
            <div className="section-heading">
              <h2>Your lesson collection</h2>
              <button
                className="button secondary"
                disabled={Boolean(book || word || lesson)}
                onClick={() => selectLesson(null)}
              >
                <Plus size={14} />
                Add lesson
              </button>
            </div>
            {content.lessons.map((item) => (
              <div className="studio-row" key={item.id}>
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    {item.level} · {item.category} · {item.minutes} minutes
                  </p>
                </div>
                <button
                  className="text-link"
                  style={{ border: 0, background: "none" }}
                  disabled={Boolean(book || word || lesson)}
                  onClick={() => selectLesson(item)}
                >
                  Edit
                </button>
              </div>
            ))}
          </section>
          {lesson ? (
            <LessonEditor
              lesson={lesson}
              onChange={setLesson}
              onSave={saveLesson}
              onCancel={() => setLesson(null)}
            />
          ) : (
            <div className="panel studio-welcome">
              <BookOpen size={37} />
              <h2>Teach something that stays.</h2>
              <p>
                Write a short lesson, add a question, and give your students
                another little way to grow.
              </p>
            </div>
          )}
        </div>
      )}
      {tab === "files" && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Your media collection</h2>
              <p>Upload a file, then connect it to a book.</p>
            </div>
            <label className="button secondary" htmlFor="studio-upload">
              <Upload size={14} />
              {busy ? "Uploading..." : "Add media"}
            </label>
            <input
              className="sr-only"
              id="studio-upload"
              type="file"
              accept=".mp3,.wav,.ogg,.m4a,.flac,.mp4,.webm,.pdf,.vtt"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                try {
                  const result = await uploadMedia(file);
                  setMessage(`Your file is ready to connect ${result.file}`);
                  await loadFiles();
                } catch (error) {
                  setMessage(
                    error instanceof Error ? error.message : "Upload failed.",
                  );
                } finally {
                  setBusy(false);
                  e.target.value = "";
                }
              }}
            />
          </div>
          {files.map((file) => (
            <div className="studio-row" key={file.file}>
              <Badge>{file.kind}</Badge>
              <div>
                <h3 style={{ overflowWrap: "anywhere" }}>{file.file}</h3>
                <p>
                  {(file.bytes / 1024 / 1024).toFixed(2)} MB ·{" "}
                  {content.books.some((b) =>
                    b.resources.some(
                      (r) => r.file === file.file || r.captions === file.file,
                    ),
                  )
                    ? "Connected to a book"
                    : "Ready to connect"}
                </p>
              </div>
              <a
                className="icon-button"
                href={`/api/media/${file.file.split("/").map(encodeURIComponent).join("/")}?download=1`}
                aria-label={`Download ${file.file}`}
              >
                <Download size={16} />
              </a>
            </div>
          ))}
          {!files.length && (
            <p className="muted" style={{ marginTop: 20 }}>
              Upload your first audio, video, or reading file to get started.
            </p>
          )}
        </section>
      )}
    </>
  );
}
