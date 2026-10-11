"use client";
import { useLocale } from "./locale-provider";
import { Bookmark, Check, Volume2 } from "lucide-react";
import { useState, type Ref } from "react";
import type { Word } from "@/lib/schema";
import { useProgress } from "./progress-provider";
import { Badge } from "./ui";
import { localEnglishVoice } from "@/lib/pronunciation";

export function WordCard({
  word,
  featured = false,
  onSavedChange,
  saveButtonRef,
}: {
  word: Word;
  featured?: boolean;
  onSavedChange?: () => void;
  saveButtonRef?: Ref<HTMLButtonElement>;
}) {
  const { t, locale, dir } = useLocale();
  const Heading = featured ? "h3" : "h2";
  const { progress, toggleSaved } = useProgress();
  const [message, setMessage] = useState("");
  const saved = progress.saved.includes(word.id);
  async function pronounce() {
    if (!("speechSynthesis" in window)) {
      setMessage("Pronunciation is unavailable in this browser.");
      return;
    }
    setMessage("");
    const voice = await localEnglishVoice();
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
    <article
      lang="en"
      dir="ltr"
      className={`word-card ${featured ? "featured-word" : ""}`}
    >
      <div className="word-top">
        <div>
          <div className="word-title">
            <Heading>{word.word}</Heading>
            <button
              className="icon-button"
              lang={locale}
              aria-label={t("Pronounce {word}", { word: word.word })}
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
          lang={locale}
          ref={saveButtonRef}
          className={`icon-button save-button ${saved ? "saved" : ""}`}
          aria-label={t(saved ? "Unsave {word}" : "Save {word}", {
            word: word.word,
          })}
          aria-pressed={saved}
          onClick={() => {
            toggleSaved(word.id);
            onSavedChange?.();
          }}
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
        <p className="inline-message" role="status" lang={locale} dir={dir}>
          {t(message)}
        </p>
      )}
    </article>
  );
}
