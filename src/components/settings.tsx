"use client";
import { useState } from "react";
import Link from "next/link";
import { putJson, uploadMedia } from "@/lib/client-api";
import { useRouter } from "next/navigation";
import { Download, Save, Upload, Wifi } from "lucide-react";
import { packSchema, type ContentPack, type Settings } from "@/lib/schema";
import { useProgress } from "./progress-provider";
import { downloadJson, PageHeading } from "./ui";

export function SchoolSettings({
  settings,
  content,
}: {
  settings: Settings;
  content: ContentPack;
}) {
  const router = useRouter();
  const { progress, restore, reset } = useProgress();
  const [name, setName] = useState(settings.name);
  const [welcome, setWelcome] = useState(settings.welcome);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pack, setPack] = useState<ContentPack | null>(null);
  const [packMessage, setPackMessage] = useState("");
  const [packBusy, setPackBusy] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [host, setHost] = useState("");
  async function selectPack(file: File | undefined) {
    setPack(null);
    setPackMessage("");
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024)
        throw new Error("Content packs must be smaller than 2 MB.");
      const parsed = packSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success)
        throw new Error(
          parsed.error.issues
            .slice(0, 4)
            .map((issue) => `${issue.path.join(".")} ${issue.message}`)
            .join(" "),
        );
      setPack(parsed.data);
      setPackMessage(
        "Ready to import. This replaces the school’s current content. Export a backup first.",
      );
    } catch (error) {
      setPackMessage(
        error instanceof Error
          ? error.message
          : "Unable to read this content pack.",
      );
    }
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    setUploadBusy(true);
    setUploadMessage("");
    try {
      const result = await uploadMedia(file);
      setUploadMessage(
        `Uploaded. Use this filename in your content pack ${result.file}`,
      );
    } catch (error) {
      setUploadMessage(
        error instanceof Error ? error.message : "Unable to upload this file.",
      );
    } finally {
      setUploadBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="MAKE THIS SPACE YOUR OWN"
        title="A home for your school’s learning."
        description="Bring your books, your words, and a little of your school’s personality."
      />
      <div className="settings-grid">
        <div className="settings-stack">
          <section className="panel settings-panel">
            <h2>A familiar welcome</h2>
            <p>These details appear across your school’s learning space.</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setMessage("");
                try {
                  await putJson("/api/settings", { name, welcome });
                  setMessage("Your school’s welcome has been saved.");
                  router.refresh();
                } catch (error) {
                  setMessage(
                    error instanceof Error ? error.message : "Unable to save.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="form-field">
                <label htmlFor="school-name">School name</label>
                <input
                  id="school-name"
                  required
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="school-welcome">Welcome message</label>
                <textarea
                  id="school-welcome"
                  required
                  rows={3}
                  maxLength={180}
                  value={welcome}
                  onChange={(e) => setWelcome(e.target.value)}
                />
              </div>
              <button className="button primary" disabled={busy}>
                <Save size={14} />
                {busy ? "Saving..." : "Save your welcome"}
              </button>
              {message && (
                <p className="inline-message" role="status">
                  {message}
                </p>
              )}
            </form>
          </section>
          <section className="panel settings-panel">
            <h2>Your school’s content collection</h2>
            <Link
              href="/studio"
              className="button primary"
              style={{ marginBottom: 18 }}
            >
              Open content studio
            </Link>
            <p>
              Export a pack, edit its words, books, and lessons, then import it
              here. Content packs replace the current collection.
            </p>
            <div className="setting-row">
              <span>Dictionary entries</span>
              <strong>{content.words.length}</strong>
            </div>
            <div className="setting-row">
              <span>Books on the shelf</span>
              <strong>{content.books.length}</strong>
            </div>
            <div className="setting-row">
              <span>Lessons to explore</span>
              <strong>{content.lessons.length}</strong>
            </div>
            <div className="button-row">
              <button
                className="button secondary"
                onClick={() =>
                  downloadJson(content, "lingualocal-content.json")
                }
              >
                <Download size={14} />
                Export content pack
              </button>
            </div>
            <div className="form-field" style={{ marginTop: 22 }}>
              <label htmlFor="content-pack">Choose a content pack</label>
              <input
                id="content-pack"
                className="file-input"
                type="file"
                accept=".json,application/json"
                onChange={(e) => void selectPack(e.target.files?.[0])}
              />
              <small>
                JSON format · Up to 2 MB · Media files are stored separately
              </small>
            </div>
            {pack && (
              <div className="inline-message">
                <strong>
                  {pack.books.length} books · {pack.words.length} words ·{" "}
                  {pack.lessons.length} lessons
                </strong>
              </div>
            )}
            {packMessage && (
              <p className="inline-message" role="status">
                {packMessage}
              </p>
            )}
            <button
              className="button primary"
              style={{ marginTop: 15 }}
              disabled={!pack || packBusy}
              onClick={async () => {
                if (!pack) return;
                setPackBusy(true);
                try {
                  await putJson("/api/content", pack);
                  setPack(null);
                  setPackMessage("Your new collection is ready to explore.");
                  router.refresh();
                } catch (error) {
                  setPackMessage(
                    error instanceof Error
                      ? error.message
                      : "Unable to import.",
                  );
                } finally {
                  setPackBusy(false);
                }
              }}
            >
              <Upload size={14} />
              {packBusy ? "Importing..." : "Replace collection with this pack"}
            </button>
          </section>
        </div>
        <div className="settings-stack">
          <section className="panel settings-panel">
            <h2>Learning on your network</h2>
            <p>
              Run LinguaLocal on a school computer. Students open its local
              address using the same Wi-Fi network.
            </p>
            <div className="setting-row">
              <span>Accounts</span>
              <strong>No sign-in needed</strong>
            </div>
            <div className="setting-row">
              <span>Content</span>
              <strong>Stored on your server</strong>
            </div>
            <div className="setting-row">
              <span>Progress</span>
              <strong>Stored in this browser</strong>
            </div>
            <button
              className="button secondary"
              style={{ marginTop: 20 }}
              onClick={() => setHost(window.location.origin)}
            >
              <Wifi size={14} />
              Show this hub’s address
            </button>
            {host && <p className="network-address">{host}</p>}
            <p style={{ marginTop: 16, marginBottom: 0 }}>
              If the address is localhost, students should use the server’s LAN
              IP address and port instead.
            </p>
          </section>
          <section className="panel settings-panel">
            <h2>Bring your books to life</h2>
            <p>
              Upload audio, video, or PDFs. Add the returned filename to a
              book’s resources in your content pack.
            </p>
            <div className="form-field">
              <label htmlFor="media-upload">Choose a media file</label>
              <input
                id="media-upload"
                className="file-input"
                type="file"
                accept=".mp3,.wav,.ogg,.m4a,.flac,.mp4,.webm,.pdf,.vtt"
                disabled={uploadBusy}
                onChange={(e) => void upload(e.target.files?.[0])}
              />
              <small>
                Up to 100 MB per upload. Larger files can be copied into the
                media directory.
              </small>
            </div>
            {uploadBusy && (
              <p className="inline-message" role="status">
                Bringing your file into the library...
              </p>
            )}
            {uploadMessage && (
              <p
                className="inline-message"
                style={{ overflowWrap: "anywhere" }}
                role="status"
              >
                {uploadMessage}
              </p>
            )}
          </section>
          <section className="panel settings-panel">
            <h2>Keep your learning journey</h2>
            <p>
              Save a personal backup, restore it on another device, or make a
              fresh start in this browser.
            </p>
            <button
              className="button secondary"
              onClick={() =>
                downloadJson(progress, "lingualocal-progress.json")
              }
            >
              <Download size={14} />
              Export my progress
            </button>
            <div className="form-field" style={{ marginTop: 20 }}>
              <label htmlFor="restore-progress">
                Restore a progress backup
              </label>
              <input
                id="restore-progress"
                className="file-input"
                type="file"
                accept=".json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    if (file.size > 2 * 1024 * 1024)
                      throw new Error("Backup is too large.");
                    if (!restore(JSON.parse(await file.text())))
                      throw new Error("This is not a valid progress backup.");
                    setBackupMessage(
                      "Your learning journey has been restored.",
                    );
                  } catch (error) {
                    setBackupMessage(
                      error instanceof Error
                        ? error.message
                        : "Unable to restore.",
                    );
                  }
                }}
              />
            </div>
            {backupMessage && (
              <p className="inline-message" role="status">
                {backupMessage}
              </p>
            )}
            {confirmReset ? (
              <div className="inline-message">
                <p>
                  Clear all learning progress in this browser? Save a backup
                  first if you want to keep it.
                </p>
                <div className="button-row">
                  <button
                    className="button secondary"
                    onClick={() => setConfirmReset(false)}
                  >
                    Keep my progress
                  </button>
                  <button
                    className="button primary"
                    onClick={() => {
                      reset();
                      setConfirmReset(false);
                      setBackupMessage(
                        "A fresh start. Your progress has been cleared.",
                      );
                    }}
                  >
                    Clear my progress
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="text-link"
                style={{ marginTop: 20, border: 0, background: "none" }}
                onClick={() => setConfirmReset(true)}
              >
                Start fresh in this browser
              </button>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
