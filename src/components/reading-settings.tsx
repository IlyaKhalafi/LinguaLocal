"use client";
import { ChevronDown } from "lucide-react";
import { useLocale } from "./locale-provider";
import { usePreferences } from "./preferences-provider";
import type { Preferences } from "@/lib/preferences";
const choices = [
  {
    key: "appearance",
    label: "Appearance",
    options: [
      ["light", "Light"],
      ["dark", "Dark"],
      ["system", "Device setting"],
    ],
  },
  {
    key: "size",
    label: "Reading size",
    options: [
      ["standard", "Standard"],
      ["large", "Larger"],
    ],
  },
  {
    key: "spacing",
    label: "Line spacing",
    options: [
      ["standard", "Standard"],
      ["relaxed", "Comfortable"],
    ],
  },
  {
    key: "font",
    label: "Reading font",
    options: [
      ["default", "Default"],
      ["readable", "Atkinson Hyperlegible"],
    ],
  },
] as const;
export function ReadingSettings() {
  const { t } = useLocale();
  const { preferences, change } = usePreferences();
  return (
    <details className="panel reading-settings">
      <summary>
        {t("Reading preferences")}
        <ChevronDown
          className="disclosure-chevron"
          size={18}
          aria-hidden="true"
        />
      </summary>
      <div className="reading-controls">
        {choices.map(({ key, label, options }) => (
          <div className="form-field" key={key}>
            <label htmlFor={`reading-${key}`}>{t(label)}</label>
            <select
              id={`reading-${key}`}
              value={preferences[key]}
              onChange={(event) =>
                change({ [key]: event.target.value } as Partial<Preferences>)
              }
            >
              {options.map(([value, label]) => (
                <option value={value} key={value}>
                  {label === "Atkinson Hyperlegible" ? label : t(label)}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div className="reading-switches">
          <label>
            <input
              type="checkbox"
              checked={preferences.contrast}
              onChange={(event) => change({ contrast: event.target.checked })}
            />
            {t("High contrast")}
          </label>
          <label>
            <input
              type="checkbox"
              checked={preferences.quiet}
              onChange={(event) => change({ quiet: event.target.checked })}
            />
            {t("Quiet mode")}
          </label>
        </div>
      </div>
    </details>
  );
}
