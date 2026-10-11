"use client";
import { levels, type Word } from "@/lib/schema";
import { useState } from "react";
export function WordEditor({
  word,
  setWord,
  editingId,
  onSave,
  onCancel,
}: {
  word: Word;
  setWord: (word: Word) => void;
  editingId: string | null;
  onSave: (word: Word) => void;
  onCancel: () => void;
}) {
  const [synonyms, setSynonyms] = useState(word.synonyms.join(", "));
  return (
    <section className="panel studio-form">
      <h2>
        {editingId ? "Make this word your own" : "A new word to discover"}
      </h2>
      {[
        { key: "word", label: "Word" },
        { key: "phonetic", label: "Phonetic spelling" },
        { key: "part", label: "Part of speech" },
        { key: "definition", label: "Definition" },
        { key: "example", label: "Example sentence" },
      ].map(({ key, label }) => (
        <div className="form-field" key={key}>
          <label htmlFor={`word-${key}`}>{label}</label>
          <input
            id={`word-${key}`}
            value={
              word[
                key as "word" | "phonetic" | "part" | "definition" | "example"
              ]
            }
            onChange={(e) => setWord({ ...word, [key]: e.target.value })}
          />
        </div>
      ))}
      <div className="form-field">
        <label htmlFor="word-level">Level</label>
        <select
          id="word-level"
          value={word.level}
          onChange={(e) =>
            setWord({ ...word, level: e.target.value as Word["level"] })
          }
        >
          {levels.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="word-synonyms">Synonyms separated by commas</label>
        <input
          id="word-synonyms"
          value={synonyms}
          onChange={(e) => setSynonyms(e.target.value)}
        />
      </div>
      <div className="button-row">
        <button
          className="button primary"
          onClick={() =>
            onSave({
              ...word,
              synonyms: synonyms
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            })
          }
        >
          Keep word in draft
        </button>
        <button className="button secondary" onClick={() => onCancel()}>
          Cancel edit
        </button>
      </div>
    </section>
  );
}
