"use client";

import { useState } from "react";
import { Download, Wifi } from "lucide-react";
import { useProgress } from "./progress-provider";
import { downloadJson, PageHeading } from "./ui";

export function PersonalSettings() {
  const { progress, restore, reset } = useProgress();
  const [message, setMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [host, setHost] = useState("");
  return (
    <>
      <PageHeading title="Settings" />
      <div className="settings-grid">
        <section className="panel settings-panel">
          <h2>Progress backup</h2>
          <button
            className="button secondary"
            onClick={() => downloadJson(progress, "lingualocal-progress.json")}
          >
            <Download size={14} />
            Export my progress
          </button>
          <div className="form-field" style={{ marginTop: 20 }}>
            <label htmlFor="restore-progress">Restore a progress backup</label>
            <input
              id="restore-progress"
              className="file-input"
              type="file"
              accept=".json"
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 2 * 1024 * 1024) {
                    setMessage("Backup is too large.");
                    return;
                  }
                  if (!restore(JSON.parse(await file.text()))) {
                    setMessage("This is not a valid progress backup.");
                    return;
                  }
                  setMessage("Progress restored.");
                } catch {
                  setMessage("This is not a valid progress backup.");
                } finally {
                  input.value = "";
                }
              }}
            />
          </div>
          <p className={message ? "inline-message" : "sr-only"} role="status">
            {message}
          </p>
          {confirmReset ? (
            <div className="inline-message">
              <p>
                Clear all progress on this device? Export a backup to keep it.
              </p>
              <div className="button-row">
                <button
                  className="button secondary"
                  onClick={() => setConfirmReset(false)}
                >
                  Cancel
                </button>
                <button
                  className="button primary"
                  onClick={() => {
                    reset();
                    setConfirmReset(false);
                    setMessage("Progress cleared.");
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
              Reset progress
            </button>
          )}
        </section>
        <section className="panel settings-panel">
          <h2>School network</h2>
          <div className="setting-row">
            <span>Accounts</span>
            <strong>No sign-in needed</strong>
          </div>
          <div className="setting-row">
            <span>Content</span>
            <strong>Managed on the school server</strong>
          </div>
          <div className="setting-row">
            <span>Progress</span>
            <strong>Stored on this device</strong>
          </div>
          <button
            className="button secondary"
            style={{ marginTop: 20 }}
            onClick={() => setHost(window.location.origin)}
          >
            <Wifi size={14} />
            Show network address
          </button>
          {host && (
            <p className="network-address" dir="ltr">
              {host}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
