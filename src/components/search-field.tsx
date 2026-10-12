"use client";

import { Search } from "lucide-react";
import { useLocale } from "./locale-provider";

export function SearchField({
  label,
  placeholder = label,
  value,
  onChange,
  autoFocus = false,
  id,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  id?: string;
}) {
  const { dir } = useLocale();
  return (
    <label className="search-field">
      <Search size={17} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input
        id={id}
        autoFocus={autoFocus}
        dir={value.trim() ? "auto" : dir}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
