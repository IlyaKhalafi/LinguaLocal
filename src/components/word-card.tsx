"use client";
import { Bookmark, Check, Volume2 } from "lucide-react";
import { useState } from "react";
import type { Word } from "@/lib/schema";
import { useProgress } from "./progress-provider";
import { Badge } from "./ui";

export function WordCard({
  word,
  featured = false,
}: {
  word: Word;
  featured?: boolean;
}) {
  const { progress, toggleSaved } = useProgress();
  const [message, setMessage] = useState("");
  const saved = progress.saved.includes(word.id);
  function pronounce() {
    if (!("speechSynthesis" in window)) {
      setMessage("Pronunciation is unavailable in this browser.");
      return;
    }
    const voice = speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.startsWith("en") && voice.localService);
    if (!voice) {
      setMessage(
        "Install an English voice on your device for offline pronunciation.",
      );
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    speechSynthesis.speak(utterance);
  }
  return (
    <article className={`word-card ${featured ? "featured-word" : ""}`}>
      <div className="word-top">
        <div>
          <div className="word-title">
            <h2>{word.word}</h2>
            <button
              className="icon-button"
              aria-label={`Pronounce ${word.word}`}
              onClick={pronounce}
            >
              <Volume2 size={18} />
            </button>
          </div>
          <p className="phonetic">
            {word.phonetic} <span>{word.part}</span>
          </p>
        </div>
        <button
          className={`icon-button save-button ${saved ? "saved" : ""}`}
          aria-label={`${saved ? "Unsave" : "Save"} ${word.word}`}
          aria-pressed={saved}
          onClick={() => toggleSaved(word.id)}
        >
          {saved ? <Check size={18} /> : <Bookmark size={18} />}
        </button>
      </div>
      <p className="definition">{word.definition}</p>
      <p className="word-example">“{word.example}”</p>
      <div className="word-bottom">
        <Badge tone="green">{word.level}</Badge>
        <span>{word.synonyms.join(" · ")}</span>
      </div>
      {message && (
        <p className="inline-message" role="status">
          {message}
        </p>
      )}
    </article>
  );
}
