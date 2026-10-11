"use client";
import { useLocale } from "@/components/locale-provider";

import { useState } from "react";
import { Download } from "lucide-react";
import { ReadingSettings } from "./reading-settings";
import { NetworkJoin } from "./network-join";
import { useProgress } from "./progress-provider";
import { progressSchema } from "@/lib/progress-schema";
import type { Progress } from "@/lib/learning";
import { useFocusOnChange } from "@/lib/use-focus-on-change";
import { downloadJson, PageHeading } from "./ui";

export function PersonalSettings() {
  const { t } = useLocale();
  const { progress, restore, reset } = useProgress();
  const [message, setMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [pending, setPending] = useState<Progress | null>(null);
  const [returnTo, setReturnTo] = useState("reset");
  const mode = confirmReset ? "reset" : pending ? "restore" : "closed";
  const focusTarget = useFocusOnChange(mode);
  return (
    <>
      <PageHeading title={t("Settings")} />
      <ReadingSettings />
      <div className="settings-grid">
        <section
          className="panel settings-panel"
          aria-labelledby="progress-backup-heading"
        >
          <h2 id="progress-backup-heading">{t("Progress backup")}</h2>
          <button
            className="button secondary"
            onClick={() => downloadJson(progress, "lingualocal-progress.json")}
          >
            <Download size={14} />
            {t("Export my progress")}
          </button>
          <div className="form-field upload-control" style={{ marginTop: 20 }}>
            <label
              htmlFor="restore-progress"
              className="button secondary upload-control"
            >
              {t("Restore a progress backup")}
            </label>
            <input
              id="restore-progress"
              className="sr-only"
              type="file"
              ref={
                mode === "closed" && returnTo === "backup"
                  ? focusTarget
                  : undefined
              }
              accept=".json"
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                setPending(null);
                setConfirmReset(false);
                setReturnTo("backup");
                setMessage("");
                try {
                  if (file.size > 2 * 1024 * 1024) {
                    setMessage("Backup is too large.");
                    return;
                  }
                  const result = progressSchema.safeParse(
                    JSON.parse(await file.text()),
                  );
                  if (!result.success) {
                    setMessage("This is not a valid progress backup.");
                    return;
                  }
                  setMessage("");
                  setReturnTo("backup");
                  setConfirmReset(false);
                  setPending(result.data);
                } catch {
                  setMessage("This is not a valid progress backup.");
                } finally {
                  input.value = "";
                }
              }}
            />
          </div>
          <p className={message ? "inline-message" : "sr-only"} role="status">
            {t(message)}
          </p>
          {pending && (
            <div
              className="inline-message"
              role="group"
              aria-label={t("Restore progress")}
            >
              <p>{t("Replace progress on this device?")}</p>
              <p>
                {t("Saved words")}{" "}
                <bdi>{t("{count}", { count: pending.saved.length })}</bdi>
                {" · "}
                {t("Completed lessons")}{" "}
                <bdi>{t("{count}", { count: pending.completed.length })}</bdi>
              </p>
              <div className="button-row">
                <button
                  ref={focusTarget}
                  className="button secondary"
                  onClick={() => setPending(null)}
                >
                  {t("Cancel")}
                </button>
                <button
                  className="button primary"
                  onClick={() => {
                    if (restore(pending)) {
                      setPending(null);
                      setMessage("Progress restored.");
                    }
                  }}
                >
                  {t("Restore progress")}
                </button>
              </div>
            </div>
          )}
          {confirmReset ? (
            <div className="inline-message">
              <p>
                {t(
                  "Clear all progress on this device? Export a backup to keep it.",
                )}
              </p>
              <div className="button-row">
                <button
                  ref={focusTarget}
                  className="button secondary"
                  onClick={() => setConfirmReset(false)}
                >
                  {t("Cancel")}
                </button>
                <button
                  className="button primary"
                  onClick={() => {
                    reset();
                    setConfirmReset(false);
                    setMessage("Progress cleared.");
                  }}
                >
                  {t("Clear my progress")}
                </button>
              </div>
            </div>
          ) : (
            <button
              ref={
                mode === "closed" && returnTo === "reset"
                  ? focusTarget
                  : undefined
              }
              className="text-link"
              style={{ marginTop: 20, border: 0, background: "none" }}
              onClick={() => {
                setPending(null);
                setReturnTo("reset");
                setConfirmReset(true);
              }}
            >
              {t("Reset progress")}
            </button>
          )}
        </section>
        <NetworkJoin />
      </div>
    </>
  );
}
